import { Cluster, Redis, RedisClient, RedisClusterOptions, RedisHostOptions } from '@diff./redis-client';
import { promises as dnsPromises } from 'dns';
import { BotDomainRegexps } from './data/BotDomainRegexps';

const CACHE_TTL = 86400; // IP 정보 캐시 유효시간
const CACHE_KEY_PREFIX = 'botName:byIp';

export class BotIpResolver {
  private redis?: Cluster | Redis;

  constructor(args?: { redisOptions: RedisClusterOptions | RedisHostOptions }) {
    const { redisOptions } = args || {};
    if (redisOptions) {
      this.redis = RedisClient.client(redisOptions);
    }
  }

  /**
   * 봇 ip 검증
   *
   * @param ip
   * @param useCache 캐시 활용 여부
   * @returns 검증된 봇의 ip 인 경우 봇의 이름, 아닌 경우 undefined 를 반환
   */
  public async resolve(ip: string, useCache: boolean = true): Promise<string | undefined> {
    if (useCache) {
      const cachedBotName = await this.cache(ip);
      if (cachedBotName) {
        return cachedBotName !== 'unknown' ? cachedBotName : undefined;
      } else {
        const botName = await this.resolve(ip, false);
        await this.setCache(ip, botName || 'unknown');
        return botName;
      }
    } else {
      // ip 의 리버스 dns 조회
      const reverseDomain = await this.reverseDomain(ip);
      if (!reverseDomain) return undefined;

      // 검증된 봇의 도메인인지 확인
      const botName = this.botNameByDomain(reverseDomain);
      if (!botName) return undefined;

      // ip 주소와 reverse dns 의 ip 가 동일한지 확인
      const rdnIp = await this.domainIp(reverseDomain);
      if (rdnIp !== ip) return undefined;

      return botName;
    }
  }

  private botNameByDomain(domain: string): string | undefined {
    for (const key in BotDomainRegexps) {
      const botName = key;
      const regexp = BotDomainRegexps[botName];
      if (regexp.test(domain)) {
        return botName;
      }
    }
    return undefined;
  }

  // IP 의 리버스 도메인 확인
  private async reverseDomain(ip: string): Promise<string | undefined> {
    try {
      const rdn = await dnsPromises.reverse(ip);
      if (!rdn) return undefined;
      return rdn[0];
    } catch (e) {
      return undefined;
    }
  }

  // 도메인의 IP 확인
  private async domainIp(domain: string): Promise<string | undefined> {
    try {
      const ip = await dnsPromises.resolve(domain);
      if (!ip) return undefined;
      return ip[0];
    } catch (e) {
      return undefined;
    }
  }

  /**
   * ip에 대한 캐시된 정보 조회
   *
   * @param ip
   * @returns 캐시가 없는 경우 undefined
   *          봇에 대한 정보가 확인되지 않은 ip 는 unknown 반환
   */
  private async cache(ip: string): Promise<string | 'unknown' | undefined> {
    if (!this.redis) return undefined;

    const cacheVal = await this.redis.get(this.cacheKey(ip));
    if (cacheVal === null) return undefined;
    else if (cacheVal === '-1') return 'unknown';
    else return cacheVal;
  }

  private async setCache(ip: string, botName: string | 'unknown'): Promise<void> {
    if (!this.redis) return;

    await this.redis.set(this.cacheKey(ip), botName === 'unknown' ? '-1' : botName, 'EX', CACHE_TTL);
  }

  public async clearCache(ip: string): Promise<boolean> {
    if (!this.redis) return false;

    const res = await this.redis.del(this.cacheKey(ip));
    return res === 1;
  }

  private cacheKey(ip: string): string {
    return CACHE_KEY_PREFIX + ':' + ip;
  }
}
