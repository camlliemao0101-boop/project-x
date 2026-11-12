function importGeneratedPages() {
  const status = sessionStorage.getItem('project-x-generated-pages');
  if (!status) return false;
  try {
    const data = JSON.parse(status);
    if (!Array.isArray(data) || data.length !== 9) return false;
    const read = (page, label) => {
      const text = data[page]?.slots?.find(slot => slot[0] === label)?.[1];
      return typeof text === 'string' ? text.slice(0,16000) : '';
    };
    const nodes = (page, selector) => [...roots[page].querySelectorAll(selector)];
    const put = (page, selector, text, index = 0) => {
      const target = nodes(page, selector)[index];
      const field = fields[page].indexOf(target);
      if (field < 0) throw Error('Editor mapping missing: ' + selector);
      draft.fields[page + ':' + field] = {text};
    };
    const remove = (page, selector, index = 0) => {
      const node = nodes(page, selector)[index];
      const id = [...roots[page].querySelectorAll('*')].indexOf(node);
      if (id < 0) throw Error('Editor block mapping missing: ' + selector);
      addOperation({type:'remove-block',id:'p' + page + '-' + id});
    };
    const map = (page, selector, label, index = 0, prefix = '') => {
      const value = read(page - 1, label);
      put(page, selector, value && (prefix && !value.startsWith(prefix) ? prefix + value : value), index);
    };

    map(1,'.intro-text p','称呼（只替换姓名）');
    map(2,'.id-agent','姓名');
    for (const [i,label] of ['代号','部门','职位','特工身份','核心特质'].entries()) {
      map(2,'.id-line',label,i,label + '：');
    }
    map(2,'.id-manifesto','行动信条',0,'行动信条：');

    map(3,'.log-code','行动代号',0,'行动代号：');
    for (let index = 0; index < 3; index++) {
      const label = '记录 0' + (index + 1);
      if (!read(2,label + ' 标题') && !read(2,label + ' 正文')) remove(3,'.log-item',index);
      else {
        map(3,'.log-item-title',label + ' 标题',index);
        map(3,'.log-item-body',label + ' 正文',index);
      }
    }
    map(3,'.log-verdict','档案结论',0,'档案结论：');

    map(4,'.scan-skill-name','首项技能标题');
    map(4,'.scan-panel:first-child .scan-body','首项技能正文');
    remove(4,'.scan-panel:first-child .scan-body',1);
    if (read(3,'补充技能标题') || read(3,'补充技能正文')) {
      map(4,'.scan-panel:nth-child(2) h3','补充技能标题');
      map(4,'.scan-panel:nth-child(2) .scan-body','补充技能正文');
    } else remove(4,'.scan-panel',1);
    if (read(3,'隐藏潜能')) {
      put(4,'.scan-panel.is-potential h3','隐藏潜能');
      map(4,'.scan-panel.is-potential .scan-body','隐藏潜能');
    } else remove(4,'.scan-panel.is-potential');

    put(5,'.sec-sub','NEXT MISSION');
    map(5,'.sec-code','行动代号',0,'行动代号：');
    remove(5,'.sec-body');
    for (const [i,label] of ['下一关期待','主线目标','关键挑战','通关信号'].entries()) {
      map(5,'.sec-body',label,i + 1);
    }

    map(6,'.proto-body','开场');
    put(6,'.proto-body','挑一条路，从手头的工作试一小步。',1);
    for (const [i,label] of ['横向拓展','纵向深耕','经验迁移'].entries()) {
      map(6,'.proto-path .proto-body',label,i);
    }
    map(6,'.proto-support .proto-body','探索手记');

    map(7,'.act-lead','引导文字');
    for (const [i,letter] of [...'ABCDEF'].entries()) {
      map(7,'.act-option-title','PATH ' + letter + ' 标题',i);
      map(7,'.act-option-body','PATH ' + letter + ' 说明',i);
    }
    map(8,'.enc-title','书页标题');
    map(8,'.enc-body','称呼');
    map(8,'.enc-body','信件正文',1);
    for (let i = 2; i < nodes(8,'.enc-body').length; i++) remove(8,'.enc-body',i);
    current = 1;
    sessionStorage.removeItem('project-x-generated-pages');
    return true;
  } catch {
    draft = {version:1, fields:{}, images:{}, layout:[]};
    return false;
  }
}
const generatedPagesImported = importGeneratedPages();
