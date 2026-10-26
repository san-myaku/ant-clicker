  let selectedResearch='dig_speed';
  const researchDialog=$('research-dialog');
  for(const branch of ['採集','育児','衛生','発酵','地質','防衛','黄金','女王','遠征']){
    const h=document.createElement('div');h.className='research-branch';h.textContent=branch;$('research-list').append(h);
    for(const def of ColonyGame.RESEARCH.filter(d=>d.branch===branch)){
      const b=document.createElement('button');b.className='research-item'+(def.planned?' planned':'');b.dataset.research=def.id;b.setAttribute('aria-pressed','false');
      const title=document.createElement('span');title.textContent=def.name;const level=document.createElement('small');b.append(title,level);
      b.onclick=()=>{selectedResearch=def.id;updateResearch();};$('research-list').append(b);
    }
  }
  function updateResearch(){
    let ready=0;
    for(const b of document.querySelectorAll('[data-research]')){
      const id=b.dataset.research,d=ColonyGame.BY_ID[id],status=sim.researchStatus(id);if(status==='ready')ready++;
      b.setAttribute('aria-pressed',String(id===selectedResearch));b.querySelector('small').textContent=status==='planned'?'準備中':status==='done'?'研究済み':d.max===Infinity?'Lv '+sim.level(id):sim.level(id)+' / '+d.max;
    }
    $('research-summary').textContent=ready?ready+'件を研究できる':'';
    if(!researchDialog.open)return;
    const d=ColonyGame.BY_ID[selectedResearch],cost=sim.researchCost(d.id),status=sim.researchStatus(d.id);
    $('research-name').textContent=d.name;$('research-effect').textContent=d.desc;
    $('research-cost').textContent=status==='planned'?'':status==='done'?'研究済み':[cost.food?'餌 '+cost.food+'個':null,cost.cookie?'クッキー '+cost.cookie+'個':null].filter(Boolean).join('・');
    const condition=status==='planned'?'まだ研究できません。':d.prereq&&!sim.level(d.prereq)?ColonyGame.BY_ID[d.prereq].name+'が必要':d.minAnts&&sim.ants.length<d.minAnts?'働き手 '+d.minAnts+'匹から':d.reached&&sim.progress.reached<d.reached?'第'+d.reached+'層への到達が必要':status==='cost'?sim.availableFood().length<cost.food?'保管中の餌があと'+(cost.food-sim.availableFood().length)+'個必要':'クッキーがあと'+(cost.cookie-sim.progress.cookie)+'個必要':'';
    $('research-condition').textContent=condition;$('research-condition').hidden=!condition;
    $('research-buy').disabled=status!=='ready';$('research-buy').textContent=status==='planned'?'準備中':status==='done'?'研究済み':'研究する';
  }
  $('open-research').onclick=()=>{researchDialog.showModal();updateResearch();};
  $('close-research').onclick=()=>researchDialog.close();
  $('research-buy').onclick=()=>{if(sim.buyResearch(selectedResearch)){persist();updateUI();}};
