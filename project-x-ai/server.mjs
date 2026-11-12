import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const fields = {
  name: 50, code: 40, team: 80, role: 80, scene: 500, evidence: 2400,
  skills: 500, potential: 500, expectation: 600, actions: 1400, note: 600,
};
const required = ['name', 'scene', 'evidence', 'skills', 'expectation'];
const pages = {
  identity: ['特工身份已解锁', ['姓名', '代号', '部门', '职位', '特工身份', '核心特质', '行动信条']],
  record: ['神秘档案', ['行动代号', '记录 01 标题', '记录 01 正文', '记录 02 标题', '记录 02 正文', '记录 03 标题', '记录 03 正文', '档案结论']],
  skills: ['王牌技能', ['首项技能标题', '首项技能正文', '补充技能标题', '补充技能正文', '隐藏潜能']],
  mission: ['特工任务', ['行动代号', '下一关期待', '主线目标', '关键挑战', '通关信号']],
  routes: ['未来行动', ['开场', '横向拓展', '纵向深耕', '经验迁移', '探索手记']],
  actions: ['行动选择', ['引导文字', ...[...'ABCDEF'].flatMap(letter => ['PATH ' + letter + ' 标题', 'PATH ' + letter + ' 说明'])]],
  letter: ['致未来的特工', ['书页标题', '称呼', '信件正文']],
};

function objectSchema(properties) {
  return {type:'object', properties, required:Object.keys(properties), additionalProperties:false};
}
const string = {type:'string'};
const schema = objectSchema({
  ...Object.fromEntries(Object.entries(pages).map(([key, [,slots]]) =>
    [key, objectSchema(Object.fromEntries(slots.map(slot => [slot,string])))])),
  followUp:string,
});

const instructions = `你是 PROJECT X 的游戏编剧。把 HRBP 的观察写成一本成人职场轻冒险手册。玩家翻开档案后，每页都要有一个可感知的游戏机制：领角色卡、重播关键帧、装备招式、解锁关卡、走分支、领挑战卡、收到片尾彩蛋。大胆设计标题和玩法，正文写人话，有一点俏皮，像同事懂你做过的事，又想邀你玩一局。用「你」，可以用问句、停顿、短句和轻微反转。少写组织评语、公文句、机械播报和战斗口号。拒绝「你展现了优秀的……」「期待进一步提升……」「系统检测到……」式的默认措辞。
开写前，从输入选出一个可见动作、一处真实取舍、一项下一步期待（缺哪项就空着）。围绕真实动作找一个有趣的机制，比如两条支线、一张可翻面的牌、一件可以带走的道具。机制随材料变，别每个人都用同一套词。不要用「解锁」「通关」「隐藏」堆出游戏感；把这些词删掉，页面也应该还有一件事可以玩、一个细节可以回味。同一段材料跨页出现时换视角，不逐页复述。
事实规则：过去只写输入明确提供的场景、行为和结果，保留数字、责任归属、未完成事项和不确定性。游戏标题与比喻可以虚构，过去的行为、对话、他人反应和结果不能虚构。未来玩法可以创作，但一律写成玩家可选的尝试。潜能用推测语气。姓名、部门、职位和已填代号用原值；缺部门、职位或潜能则返回空字符串。不得建议换岗、晋升或向管理者提出职业诉求。
【特工身份已解锁｜角色卡】特工身份给一个能让人想象其出场方式的角色名。核心特质写成两三个玩家动作，信条像角色卡背面的一句提示。没有填写代号时，从实际动作取一个短名字。
【神秘档案｜回放关键帧】每条标题像一段值得点开的录像，优先用反差或停顿，比如「接口还在等。这一步先走。」正文直接切进当时的卡点，写一两个可见动作，再落在有依据的结果；没有结果就停在动作。允许用「卡住的地方」「你动的那一步」这样的叙事节拍，不要固定打印这些标签。最多三条，材料不足则留空，不能拆造事件。
【王牌技能｜装备招式】名字要像一句同事之间能拿来用的话，也可以是道具名。写清「触发条件」和「实际怎么用」，用一个事实作支撑。潜能可写成尚未点亮的支线，说明在哪类任务里可以继续观察。技能不是人格定论。
【特工任务｜可玩的下一关】代号用一个有趣又贴题的名字，例如「口袋里放两张路线卡」适合先提备选方案的任务。下一关期待用邀请语气；主线目标交代在哪种场景出发；关键挑战给玩家一个选择、限制或取舍；通关信号是可以看见的小产物或动作，不能许诺绩效结果。
【未来行动｜三条岔路】横向从现有跨部门或公司级项目切入，纵向在手头工作里练判断和取舍，经验迁移把一个做法留给下一次。每条给一种不同玩法，比如换视角、做对照、带走小道具。开场有一句像在地图前招呼玩家的话；探索手记留一个具体的回看问题。材料明确给出的支持可写成玩家能取用的资源。
【行动选择｜六张挑战卡】A/B、C/D、E/F 分别对应三条岔路。每组第一张轻量，第二张有变化或多一步。每张给一个标题和一句可以立刻执行的挑战，六张卡的动作、产物或视角要有区别。不要六次换词重复「梳理」「沟通」「提升」。
【致未来的特工｜片尾彩蛋】称呼写「亲爱的{员工称呼}：」。拣一个真实细节，像把一件小道具留在信里。正文可以轻轻回扣前面的招式或路线，让员工自己决定下一次想怎么玩。HRBP 提供的那句话可改写，但保留原意。
档案入口和最后一条密讯由产品处理，请勿输出。字段内只放对应文案，别把玩法说明或这些规则抄进档案。示例只用于说明写法，不能搬用其事实。资料不足写入 followUp。返回前检查：每页能不能和另外几页区分？这份文案换个人还成立吗？如果太通用，回到材料找一个真的发生过的动作。`;

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readMaterial(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 48_000) throw new RequestError(413, '内容太长，请精简后再试。');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError(400, '提交格式有误，请刷新页面再试。'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RequestError(400, '请检查填写内容。');
  const result = {};
  for (const [key, max] of Object.entries(fields)) {
    const value = data[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw new RequestError(400, '有一项填写内容超过长度限制。');
    result[key] = value.trim();
  }
  if (required.some(key => !result[key])) throw new RequestError(400, '请填写所有必填项。');
  return result;
}

function formatPages(output, name) {
  if (!output || typeof output.followUp !== 'string') throw new Error('Missing model response');
  return [
    {title:'档案入口',slots:[['称呼（只替换姓名）', name + ',']]},
    ...Object.entries(pages).map(([key, [title, labels]]) => ({
      title: key === 'letter' ? title + ' ' + name : title,
      slots: labels.map(label => {
        const value = output[key]?.[label];
        if (typeof value !== 'string') throw new Error('Malformed model response');
        return [label, value.trim()];
      }).filter(([,value]) => value)
    })),
    {title:'最后一条密讯',slots:[['自动生成','导出后，员工阅读版会根据前面的档案内容和员工确认的行动生成这页。']]}
  ];
}

const digest = value => createHash('sha256').update(value).digest();

export async function createApp({
  provider = process.env.PROJECT_X_PROVIDER || 'openai',
  apiKey = provider === 'qwen' ? process.env.DASHSCOPE_API_KEY : process.env.OPENAI_API_KEY,
  accessToken = process.env.PROJECT_X_ACCESS_TOKEN,
  model = provider === 'qwen' ? process.env.DASHSCOPE_MODEL || 'qwen3.8-max' : process.env.OPENAI_MODEL || 'gpt-6.1-sol',
  fetchModel = globalThis.fetch,
} = {}) {
  if (!accessToken || accessToken.length < 32) throw new Error('Configure PROJECT_X_ACCESS_TOKEN with at least 32 random characters.');
  if (!['openai','qwen'].includes(provider)) throw new Error('PROJECT_X_PROVIDER must be openai or qwen.');
  const useQwen = provider === 'qwen';
  if (!apiKey) throw new Error('Configure ' + (useQwen ? 'DASHSCOPE_API_KEY' : 'OPENAI_API_KEY') + ' on the server.');
  const html = (await readFile(new URL('./index.html', import.meta.url), 'utf8'))
    .replace('发送给 OpenAI 改写', '发送给 ' + (useQwen ? '阿里云百炼（通义千问）' : 'OpenAI') + ' 改写');
  const editorTemplate = await readFile(new URL('./editor-template.html', import.meta.url),'utf8');
  const importer = await readFile(new URL('./editor-import.js', import.meta.url),'utf8');
  const editor = editorTemplate.replace(/\brender\(\);\s*<\/script>\s*<\/html>\s*$/, () =>
    importer + '\nrender();\nif (generatedPagesImported) notice("文案已带入。核对书页后可导出员工阅读版。");\n</script></html>');
  if (editor === editorTemplate) throw new Error('Editor integration marker missing.');
  const endpoint = useQwen
    ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    : 'https://api.openai.com/v1/responses';
  const jsonLayout = JSON.stringify(Object.fromEntries([
    ...Object.entries(pages).map(([key, [,labels]]) => [key, Object.fromEntries(labels.map(label => [label,'']))]),
    ['followUp',''],
  ]));
  const tokenHash = digest(accessToken);
  let calls = [];
  let active = 0;
  return createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    function reply(status,body) {
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify(body));
    }
    const path = req.url.split('?')[0];
    if (req.method === 'GET' && (path === '/' || path === '/editor')) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      res.end(path === '/editor' ? editor : html);
      return;
    }
    if (req.method !== 'POST' || path !== '/api/rewrite') return reply(404,{error:'找不到这个页面。'});
    const token = req.headers['x-project-x-access'];
    if (typeof token !== 'string' || !timingSafeEqual(digest(token),tokenHash)) {
      return reply(403,{error:'请使用 HRBP 专用链接重新打开页面。'});
    }
    try {
      const material = await readMaterial(req);
      const now = Date.now();
      calls = calls.filter(time => now - time < 3_600_000);
      if (active >= 3 || calls.length >= 30) throw new RequestError(429,'当前生成请求较多，请稍后再试。');
      calls.push(now);
      active++;
      try {
        const input = JSON.stringify(material);
        const payload = useQwen ? {
          model,
          messages: [
            {role:'system',content:instructions + '\n返回一个 JSON 对象，键名严格按下列模板，字段值只用字符串：\n' + jsonLayout},
            {role:'user',content:input},
          ],
          enable_thinking:false,
          response_format:{type:'json_object'},
          max_tokens:6000,
        } : {
          model, instructions, input, store:false, max_output_tokens:6000,
          text:{format:{type:'json_schema',name:'project_x_pages',strict:true,schema}},
        };
        const response = await fetchModel(endpoint, {
          method:'POST',
          headers:{Authorization:'Bearer ' + apiKey,'Content-Type':'application/json'},
          body:JSON.stringify(payload),
          signal:AbortSignal.timeout(75_000),
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          const upstream = detail?.error || detail;
          const code = String(upstream?.code || '');
          const message = String(upstream?.message || '');
          const knownCode = /^(?:AllocationQuota\.FreeTierOnly|InvalidApiKey|invalid_api_key|AccessDenied(?:\.Unpurchased)?|access_denied|Arrearage|AccountOverdue|Endpoint\.AccessDenied|ModelNotFound|model_not_found)$/i.test(code);
          const tag = '（HTTP ' + response.status + (knownCode ? ' · ' + code : '') + '）';
          if (/FreeTierOnly|free tier.*exhaust|use free tier only/i.test(code + ' ' + message)) {
            throw new RequestError(502, '百炼仅允许使用免费额度。请在百炼控制台检查「免费额度用完即停」开关' + tag + '。');
          }
          if (/balance|overdue|arrear|good standing/i.test(code + ' ' + message) || response.status === 402) {
            throw new RequestError(502, '模型平台提示余额不足或欠费。请检查密钥所属账号的可用余额' + tag + '。');
          }
          if (response.status === 401) {
            throw new RequestError(502, '密钥鉴权失败。请检查是否为华北 2（北京）的百炼通用 API Key' + tag + '。');
          }
          if (response.status === 403) {
            throw new RequestError(502, '模型平台拒绝调用。请检查密钥所属业务空间是否允许调用 ' + model + tag + '。');
          }
          if (response.status === 429) throw new RequestError(429, '模型平台请求过多或触发额度限制，请检查额度后再试' + tag + '。');
          throw new RequestError(502, '模型平台返回错误' + tag + '。');
        }
        const result = await response.json();
        const text = useQwen
          ? result.choices?.[0]?.message?.content
          : (result.output || []).flatMap(item => item.content || [])
            .filter(item => item.type === 'output_text').map(item => item.text).join('');
        const output = JSON.parse(text);
        return reply(200,{pages:formatPages(output,material.name),followUp:output.followUp.trim()});
      } finally { active--; }
    } catch (error) {
      if (error.name === 'TimeoutError') return reply(504,{error:'模型响应超过 75 秒。本次未收到结果，请稍后重试。'});
      return reply(error.status || 502,{error:error.status ? error.message : '模型返回的文案不完整，请重试。'});
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createApp();
  const port = Number(process.env.PORT || 3000);
  server.listen(port,process.env.PROJECT_X_HOST || '0.0.0.0',() => console.log('PROJECT X AI listening on port ' + port));
}
