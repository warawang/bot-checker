const BotDomainRegexps: Record<string, RegExp> = {
  google: /(googlebot\.com|google\.com)$/,
  naver: /naver\.com$/,
  yahoo: /(yahoo\.com|yahoo\.net|yahoo\.co\.jp)$/,
  twitter: /(twttr\.com|twitter\.com)$/,
  bing: /msn\.com$/
};

export { BotDomainRegexps };
