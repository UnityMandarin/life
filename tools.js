(() => {
  'use strict';
  const favoritesKey='life-tool-favorites-v1', recentsKey='life-tool-recents-v1';
  const read=(key)=>{try{const x=JSON.parse(localStorage.getItem(key));return Array.isArray(x)?x:[];}catch{return [];}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
  const normalized=url=>{const parsed=new URL(url);return parsed.origin+parsed.pathname.replace(/\/$/,'');};
  let favorites=read(favoritesKey),filter='all';
  const search=document.querySelector('#bookmark-search'),sections=[...document.querySelectorAll('[data-section]')];
  const tools=[...document.querySelectorAll('.bookmark')].map(link=>{
    const wrapper=document.createElement('div');wrapper.className='tool-wrap';link.replaceWith(wrapper);wrapper.append(link);
    const key=normalized(link.href),title=link.querySelector('h3').textContent,button=document.createElement('button');button.className='favorite';button.type='button';button.setAttribute('aria-label','Favorite '+title);wrapper.append(button);
    button.addEventListener('click',()=>{favorites=favorites.includes(key)?favorites.filter(x=>x!==key):[key,...favorites].slice(0,40);write(favoritesKey,favorites);render();});
    link.addEventListener('click',()=>write(recentsKey,[{url:key,title,timestamp:Date.now()},...read(recentsKey).filter(x=>x.url!==key)].slice(0,12)));
    return {link,wrapper,key,button};
  });
  function render(){
    const query=search.value.trim().toLocaleLowerCase();let count=0;
    for(const {link,wrapper,key,button} of tools){const selected=favorites.includes(key);button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'★':'☆';wrapper.hidden=!!((filter==='favorites'&&!selected)||(query&&!link.dataset.search.toLocaleLowerCase().includes(query)));if(!wrapper.hidden)count++;}
    for(const section of sections)section.hidden=![...section.querySelectorAll('.tool-wrap')].some(x=>!x.hidden);
    document.querySelector('#bookmark-count').textContent=count+(count===1?' place':' places');document.querySelector('#empty-state').hidden=count!==0;document.querySelector('#clear-search').hidden=!query;
  }
  search.addEventListener('input',render);
  document.querySelector('#clear-search').addEventListener('click',()=>{search.value='';render();search.focus();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));render();}));
  render();
})();
