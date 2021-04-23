import { expect } from 'chai';
import { BotIpResolver } from '../../src/BotIpResolver';

const resolver = new BotIpResolver({
  redisOptions: {
    type: 'standalone',
    host: '127.0.0.1',
    port: 6379,
    keyPrefix: 'bot-checker:'
  }
});

describe('check-ip', async () => {
  it('일반 IP 요청시 검증 실패', async () => {
    const ipInfo = await resolver.resolve('121.133.67.82');
    expect(ipInfo).to.be.undefined;
  });

  it('구글 크롤러 IP 검증', async () => {
    const ipInfo = await resolver.resolve('66.249.66.1');
    expect(ipInfo).to.be.eq('google');
  });

  it('네이버 크롤러 IP 검증', async () => {
    const ipInfo = await resolver.resolve('125.209.235.169');
    expect(ipInfo).to.be.eq('naver');
  });

  it('트위터 크롤로 IP 검증', async () => {
    const ipInfo = await resolver.resolve('199.16.157.180');
    expect(ipInfo).to.be.eq('twitter');
  });
});
