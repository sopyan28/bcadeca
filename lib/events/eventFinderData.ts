// Handoff data supplied with the event matcher. It is consumed through the
// normalized public exports below, rather than treated as application logic.
// @ts-nocheck
const BASE = 'https://www.deca.org/compete/';

const rows = [
['ACT','Accounting Applications Series','Individual Series','Finance',1,'exam','accounting finance data analysis numbers','accounting-applications-series'],
['AAM','Apparel and Accessories Marketing Series','Individual Series','Marketing',1,'exam','fashion retail marketing creativity','apparel-and-accessories-marketing-series'],
['ASM','Automotive Services Marketing Series','Individual Series','Marketing',1,'exam','automotive services marketing sales customer','automotive-services-marketing-series'],
['BFS','Business Finance Series','Individual Series','Finance',1,'exam','finance analysis credit banking numbers','business-finance-series'],
['EBG','Business Growth Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','business growth entrepreneurship strategy ownership writing','business-growth-plan'],
['BLTDM','Business Law and Ethics Team Decision Making','Team Decision Making','Business Management and Administration',2,'exam','law ethics management partner case','business-law-and-ethics-team-decision-making'],
['BSM','Business Services Marketing Series','Individual Series','Marketing',1,'exam','business services b2b marketing customer sales','business-services-marketing-series'],
['BOR','Business Services Operations Research','Business Operations Research','Business Management and Administration','1-3','prepared','research strategy business services analysis writing','business-services-operations-research'],
['PMBS','Business Solutions Project','Project Management','Business Management and Administration','1-3','prepared','project management solutions implementation organization','business-solutions-project'],
['BMOR','Buying and Merchandising Operations Research','Business Operations Research','Marketing','1-3','prepared','retail merchandising research strategy buying','buying-and-merchandising-operations-research'],
['BTDM','Buying and Merchandising Team Decision Making','Team Decision Making','Marketing',2,'exam','retail merchandising buying partner case marketing','buying-and-merchandising-team-decision-making'],
['PMCD','Career Development Project','Project Management','Business Management and Administration','1-3','prepared','career education project management leadership','career-development-project'],
['PMCA','Community Awareness Project','Project Management','Business Management and Administration','1-3','prepared','community awareness project management outreach','community-awareness-project'],
['PMCG','Community Giving Project','Project Management','Business Management and Administration','1-3','prepared','community service giving fundraising project management','community-giving-project'],
['ENT','Entrepreneurship Series','Individual Series','Entrepreneurship',1,'exam','entrepreneurship startup ownership business roleplay','entrepreneurship-series'],
['ETDM','Entrepreneurship Team Decision Making','Team Decision Making','Entrepreneurship',2,'exam','entrepreneurship startup partner case ownership','entrepreneurship-team-decision-making'],
['FOR','Finance Operations Research','Business Operations Research','Finance','1-3','prepared','finance research analysis strategy writing','finance-operations-research'],
['FCE','Financial Consulting','Professional Selling and Consulting','Finance',1,'exam','finance consulting client analysis presentation','financial-consulting'],
['PMFL','Financial Literacy Project','Project Management','Business Management and Administration','1-3','prepared','financial literacy education project community','financial-literacy-project'],
['FTDM','Financial Services Team Decision Making','Team Decision Making','Finance',2,'exam','finance banking investment partner case','financial-services-team-decision-making'],
['FMS','Food Marketing Series','Individual Series','Marketing',1,'exam','food grocery marketing retail customer','food-marketing-series'],
['EFB','Franchise Business Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','franchise entrepreneurship plan ownership research','franchise-business-plan'],
['HTOR','Hospitality and Tourism Operations Research','Business Operations Research','Hospitality and Tourism','1-3','prepared','hospitality tourism research strategy hotel travel','hospitality-and-tourism-operations-research'],
['HTPS','Hospitality and Tourism Professional Selling','Professional Selling and Consulting','Hospitality and Tourism',1,'exam','hospitality tourism selling client presentation','hospitality-and-tourism-professional-selling'],
['HTDM','Hospitality Services Team Decision Making','Team Decision Making','Hospitality and Tourism',2,'exam','hospitality hotel service partner case','hospitality-services-team-decision-making'],
['HLM','Hotel and Lodging Management Series','Individual Series','Hospitality and Tourism',1,'exam','hotel lodging hospitality management guest','hotel-and-lodging-management-series'],
['HRM','Human Resources Management Series','Individual Series','Business Management and Administration',1,'exam','human resources hiring training management people','human-resources-management-series'],
['EIB','Independent Business Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','business plan entrepreneurship ownership startup writing','independent-business-plan'],
['EIP','Innovation Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','innovation idea startup pitch entrepreneurship','innovation-plan'],
['IMCE','Integrated Marketing Campaign–Event','Integrated Marketing Campaign','Marketing','1-3','prepared-exam','event marketing campaign creativity promotion pitch','integrated-marketing-campaign-event'],
['IMCP','Integrated Marketing Campaign–Product','Integrated Marketing Campaign','Marketing','1-3','prepared-exam','product marketing campaign creativity promotion pitch','integrated-marketing-campaign-product'],
['IMCS','Integrated Marketing Campaign–Service','Integrated Marketing Campaign','Marketing','1-3','prepared-exam','service marketing campaign creativity promotion pitch','integrated-marketing-campaign-service'],
['IBP','International Business Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','international global business entrepreneurship plan research','international-business-plan'],
['MCS','Marketing Communications Series','Individual Series','Marketing',1,'exam','advertising communications branding promotion creativity','marketing-communications-series'],
['MTDM','Marketing Management Team Decision Making','Team Decision Making','Marketing',2,'exam','marketing management partner case strategy','marketing-management-team-decision-making'],
['PFL','Personal Financial Literacy','Personal Financial Literacy','Personal Financial Literacy',1,'exam','personal finance budgeting credit saving investing','personal-financial-literacy'],
['PBM','Principles of Business Management and Administration','Principles of Business Administration','Business Management and Administration',1,'exam','first year management business basics roleplay','principles-of-business-management-and-administration'],
['PEN','Principles of Entrepreneurship','Principles of Business Administration','Entrepreneurship',1,'exam','first year entrepreneurship startup basics roleplay','principles-of-entrepreneurship'],
['PFN','Principles of Finance','Principles of Business Administration','Finance',1,'exam','first year finance basics roleplay numbers','principles-of-finance'],
['PHT','Principles of Hospitality and Tourism','Principles of Business Administration','Hospitality and Tourism',1,'exam','first year hospitality tourism basics roleplay','principles-of-hospitality-and-tourism'],
['PMK','Principles of Marketing','Principles of Business Administration','Marketing',1,'exam','first year marketing basics roleplay','principles-of-marketing'],
['PSE','Professional Selling','Professional Selling and Consulting','Marketing',1,'exam','sales product client presentation persuasion','professional-selling'],
['QSRM','Quick Serve Restaurant Management Series','Individual Series','Hospitality and Tourism',1,'exam','restaurant quick service food hospitality operations','quick-serve-restaurant-management-series'],
['RFSM','Restaurant and Food Service Management Series','Individual Series','Hospitality and Tourism',1,'exam','restaurant food service hospitality management','restaurant-and-food-service-management-series'],
['RMS','Retail Merchandising Series','Individual Series','Marketing',1,'exam','retail merchandising store marketing customer','retail-merchandising-series'],
['PMSP','Sales Project','Project Management','Business Management and Administration','1-3','prepared','sales project fundraising client project management','sales-project'],
['SEOR','Sports and Entertainment Marketing Operations Research','Business Operations Research','Marketing','1-3','prepared','sports entertainment marketing research strategy','sports-and-entertainment-marketing-operations-research'],
['SEM','Sports and Entertainment Marketing Series','Individual Series','Marketing',1,'exam','sports entertainment marketing sponsorship promotion','sports-and-entertainment-marketing-series'],
['STDM','Sports and Entertainment Marketing Team Decision Making','Team Decision Making','Marketing',2,'exam','sports entertainment marketing partner case','sports-and-entertainment-marketing-team-decision-making'],
['ESB','Start-Up Business Plan','Entrepreneurship','Entrepreneurship','1-3','prepared','startup business plan entrepreneurship pitch ownership','start-up-business-plan'],
['SMG','Stock Market Game','Online Events','Finance','1-3','online','stocks portfolio investing analysis simulation','stock-market-game'],
['TTDM','Travel and Tourism Team Decision Making','Team Decision Making','Hospitality and Tourism',2,'exam','travel tourism partner case hospitality','travel-and-tourism-team-decision-making'],
['VBCAC','Virtual Business Challenge–Accounting','Online Events','Finance','1-3','online','simulation accounting finance numbers computer','virtual-business-challenge-accounting'],
['VBCEN','Virtual Business Challenge–Entrepreneurship','Online Events','Entrepreneurship','1-3','online','simulation entrepreneurship startup computer','virtual-business-challenge-entrepreneurship'],
['VBCFA','Virtual Business Challenge–Fashion','Online Events','Marketing','1-3','online','simulation fashion retail marketing computer','virtual-business-challenge-fashion'],
['VBCHM','Virtual Business Challenge–Hotel Management','Online Events','Hospitality and Tourism','1-3','online','simulation hotel hospitality management computer','virtual-business-challenge-hotel-management'],
['VBCPF','Virtual Business Challenge–Personal Finance','Online Events','Personal Financial Literacy','1-3','online','simulation personal finance budgeting investing computer','virtual-business-challenge-personal-finance'],
['VBCRS','Virtual Business Challenge–Restaurant','Online Events','Hospitality and Tourism','1-3','online','simulation restaurant food service hospitality computer','virtual-business-challenge-restaurant'],
['VBCRT','Virtual Business Challenge–Retail','Online Events','Marketing','1-3','online','simulation retail merchandising marketing computer','virtual-business-challenge-retail'],
['VBCSP','Virtual Business Challenge–Sports','Online Events','Marketing','1-3','online','simulation sports marketing computer','virtual-business-challenge-sports']
];

export const EVENTS = rows.map(x => ({
  code: x[0], name: x[1], category: x[2], cluster: x[3],
  participants: x[4], format: x[5], tags: x[6], slug: x[7], url: BASE + x[7]
}));

export const FINDER_QUESTIONS = [
{q:'Is this your first year as a DECA member?',opts:[['Yes, I\u2019m a first-year member',{first:true}],['No, I\u2019ve competed or been a member before',{first:false}]]},
{q:'How do you most want to compete?',opts:[['By myself',{people:'solo'}],['With one partner',{people:'pair'}],['With a team of up to three',{people:'team'}],['I\u2019m flexible',{people:'any'}]]},
{q:'Which competition style sounds best?',opts:[['Think on my feet in a role-play',{style:'roleplay'}],['Analyze a case with a partner',{style:'teamcase'}],['Prepare a project or plan in advance',{style:'prepared'}],['Compete in an online simulation',{style:'online'}]]},
{q:'Which career area interests you most?',opts:[['Marketing / advertising / retail',{cluster:'Marketing'}],['Finance / investing / accounting',{cluster:'Finance'}],['Management / HR / business law',{cluster:'Business Management and Administration'}],['Hospitality / food / travel',{cluster:'Hospitality and Tourism'}],['Entrepreneurship / owning a business',{cluster:'Entrepreneurship'}],['Personal finance',{cluster:'Personal Financial Literacy'}]]},
{q:'How do you feel about a 100-question career-cluster exam?',opts:[['Good, I\u2019m willing to study for it',{exam:2}],['Fine if the event is worth it',{exam:1}],['I would strongly prefer no exam',{exam:-2}]]},
{q:'How much do you like writing long reports or building detailed pitch decks?',opts:[['A lot, I like structured long-term work',{write:2}],['Somewhat',{write:1}],['Not much, I prefer live competition',{write:-2}]]},
{q:'How much do you enjoy research and using evidence to make recommendations?',opts:[['A lot',{research:2}],['Somewhat',{research:1}],['Not really',{research:-1}]]},
{q:'Would you enjoy running a real project at BCA or in the community?',opts:[['Yes, planning and executing sounds fun',{project:2}],['Maybe',{project:1}],['No, I\u2019d rather compete with a scenario',{project:-1}]]},
{q:'How much do you like selling, persuading or consulting with a \u201cclient\u201d?',opts:[['A lot',{sales:2}],['It\u2019s okay',{sales:1}],['Not my thing',{sales:-1}]]},
{q:'How interested are you in computer-based business simulations?',opts:[['Very interested',{simulation:2}],['Maybe as a second choice',{simulation:1}],['Not interested',{simulation:-2}]]},
{q:'Would managing a stock portfolio for competition interest you?',opts:[['Definitely',{stocks:2}],['Maybe',{stocks:1}],['No',{stocks:-1}]]},
{q:'Which specialized industry sounds most fun?',opts:[['Sports / entertainment',{industry:'sports'}],['Fashion / apparel',{industry:'fashion'}],['Automotive',{industry:'automotive'}],['Food / restaurants',{industry:'food'}],['Hotels / travel',{industry:'hotel travel'}],['Retail / merchandising',{industry:'retail'}],['HR / people management',{industry:'human resources'}],['Accounting / numbers',{industry:'accounting'}],['Business law / ethics',{industry:'law ethics'}],['No strong preference',{industry:''}]]},
{q:'How much time can you realistically commit outside meetings?',opts:[['A lot, I can build a major project over months',{time:2}],['Moderate, regular weekly practice is fine',{time:1}],['Limited, I want something practiceable in short sessions',{time:-1}]]},
{q:'Do you like creative branding, promotion and campaign ideas?',opts:[['Yes, very much',{creative:2}],['A little',{creative:1}],['Not especially',{creative:-1}]]},
{q:'Do you enjoy numbers, data and financial analysis?',opts:[['Yes',{data:2}],['Sometimes',{data:1}],['Not really',{data:-1}]]},
{q:'How comfortable are you speaking to a judge with limited prep time?',opts:[['Very comfortable',{live:2}],['I can get comfortable with practice',{live:1}],['I prefer rehearsing exactly what I\u2019ll say',{live:-2}]]},
{q:'How important is working closely with a partner or team?',opts:[['Very important',{collab:2}],['Nice, but not required',{collab:1}],['I prefer full control myself',{collab:-1}]]},
{q:'Would you like an event about creating, growing or owning a business?',opts:[['Yes, that\u2019s one of my top interests',{owner:2}],['Maybe',{owner:1}],['No',{owner:-1}]]},
{q:'Which task sounds most satisfying?',opts:[['Solve a customer or manager problem quickly',{task:'live'}],['Build a strategy from research',{task:'research'}],['Pitch an idea, product or recommendation',{task:'pitch'}],['Operate a simulated business and optimize results',{task:'sim'}]]},
{q:'For your final match, what matters most?',opts:[['I want the best event for my interests',{priority:'interest'}],['I want the format I\u2019m most likely to enjoy practicing',{priority:'format'}],['I want to use skills I already have at BCA',{priority:'skills'}],['I want something new that will challenge me',{priority:'challenge'}]]}
];

export function scoreEvent(e, p) {
  let s = 0; const reasons = [];
  if (p.first === false && e.category === 'Principles of Business Administration') return {score:-999, reasons:[]};
  if (p.first === true && e.category === 'Principles of Business Administration') { s += 8; reasons.push('first-year DECA fit'); }
  if (p.cluster === e.cluster) { s += 11; reasons.push(e.cluster + ' interest'); }
  if (p.people === 'solo' && e.participants === 1) s += 6;
  if (p.people === 'solo' && e.participants !== 1) s -= 4;
  if (p.people === 'pair' && e.participants === 2) s += 7;
  if (p.people === 'team' && e.participants === '1-3') s += 7;
  if (p.people === 'any') s += 1;
  const liveCats = ['Individual Series','Principles of Business Administration','Personal Financial Literacy'];
  if (p.style === 'roleplay' && liveCats.includes(e.category)) { s += 10; reasons.push('individual role-play format'); }
  if (p.style === 'teamcase' && e.category === 'Team Decision Making') { s += 10; reasons.push('partner case-study format'); }
  if (p.style === 'prepared' && ['Business Operations Research','Project Management','Entrepreneurship','Integrated Marketing Campaign','Professional Selling and Consulting'].includes(e.category)) { s += 9; reasons.push('prepared-event format'); }
  if (p.style === 'online' && e.category === 'Online Events') { s += 11; reasons.push('online simulation format'); }
  const hasExam = e.format.includes('exam');
  if (p.exam > 0 && hasExam) s += p.exam;
  if (p.exam < 0 && hasExam) s += p.exam * 2;
  if (p.exam < 0 && !hasExam) s += 5;
  const isPrepared = e.format.includes('prepared');
  if (p.write > 0 && isPrepared) s += p.write * 3;
  if (p.write < 0 && isPrepared) s += p.write * 3;
  if (p.research > 0 && e.category === 'Business Operations Research') s += p.research * 4;
  if (p.research < 0 && e.category === 'Business Operations Research') s -= 3;
  if (p.project > 0 && e.category === 'Project Management') s += p.project * 4;
  if (p.project < 0 && e.category === 'Project Management') s -= 3;
  if (p.sales > 0 && e.category === 'Professional Selling and Consulting') s += p.sales * 4;
  if (p.simulation > 0 && e.category === 'Online Events') s += p.simulation * 4;
  if (p.simulation < 0 && e.category === 'Online Events') s -= 5;
  if (p.stocks > 0 && e.code === 'SMG') s += p.stocks * 7;
  if (p.industry && e.tags.includes(p.industry)) { s += 7; reasons.push(p.industry + ' specialization'); }
  if (p.time === 2 && isPrepared) s += 4;
  if (p.time === -1 && isPrepared) s -= 5;
  if (p.time === -1 && liveCats.includes(e.category)) s += 3;
  if (p.creative > 0 && (e.cluster === 'Marketing' || e.category === 'Integrated Marketing Campaign')) s += p.creative * 3;
  if (p.data > 0 && (e.cluster === 'Finance' || e.tags.includes('analysis') || e.tags.includes('accounting'))) s += p.data * 3;
  if (p.live > 0 && liveCats.concat(['Team Decision Making','Professional Selling and Consulting']).includes(e.category)) s += p.live * 2;
  if (p.live < 0 && isPrepared) s += 4;
  if (p.collab > 0 && (e.participants === 2 || e.participants === '1-3')) s += p.collab * 2;
  if (p.collab < 0 && e.participants === 1) s += 3;
  if (p.owner > 0 && e.cluster === 'Entrepreneurship') { s += p.owner * 5; reasons.push('entrepreneurship/ownership interest'); }
  if (p.task === 'research' && e.category === 'Business Operations Research') s += 6;
  if (p.task === 'pitch' && ['Integrated Marketing Campaign','Professional Selling and Consulting','Entrepreneurship'].includes(e.category)) s += 5;
  if (p.task === 'sim' && e.category === 'Online Events') s += 6;
  if (p.task === 'live' && ['Individual Series','Team Decision Making','Principles of Business Administration'].includes(e.category)) s += 5;
  return { score: s, reasons: Array.from(new Set(reasons)).slice(0, 3) };
}

export function describeEvent(e) {
  const m = {
    'Team Decision Making': '2-person case study',
    'Individual Series': 'individual role-plays',
    'Principles of Business Administration': 'first-year individual role-play',
    'Business Operations Research': 'research + strategic plan',
    'Project Management': 'real project + prepared presentation',
    'Integrated Marketing Campaign': 'prepared campaign + presentation',
    'Professional Selling and Consulting': 'individual sales/consulting presentation',
    'Online Events': 'online simulation/portfolio competition',
    'Entrepreneurship': 'prepared entrepreneurship plan/pitch',
    'Personal Financial Literacy': 'individual personal-finance role-play'
  };
  return (m[e.category] || 'prepared event') + ' • ' + e.cluster;
}
