(function(window){
  'use strict';

  // Helpers module - data persistence, date utilities, and validation
  window.AppHelpers = window.AppHelpers || {};

  const STORAGE_KEY = 'grat-journal-v1';

  // Utility: get ISO date string for local date (yyyy-mm-dd)
  function todayISO(){
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    const local = new Date(d - tz);
    return local.toISOString().slice(0,10);
  }

  // Format date for display
  function formatDate(iso){
    try{
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }catch(e){
      return iso;
    }
  }

  // Load entries from localStorage
  function loadEntries(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      // Ensure date and id types
      return parsed.map(e => ({ id: e.id, date: String(e.date), content: String(e.content), prompt: e.prompt || null, createdAt: e.createdAt || null }));
    }catch(e){
      console.error('Failed to load entries', e);
      return [];
    }
  }

  function saveEntries(entries){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    }catch(e){
      console.error('Failed to save entries', e);
      return false;
    }
  }

  // Create a simple unique id
  function uid(){
    return 'g-' + Math.random().toString(36).slice(2,9);
  }

  function addEntry({date, content, prompt}){
    if(!date) date = todayISO();
    const entries = loadEntries();
    const item = { id: uid(), date: String(date), content: String(content), prompt: prompt || null, createdAt: new Date().toISOString() };
    entries.push(item);
    saveEntries(entries);
    return item;
  }

  function updateEntry(id, updates){
    const entries = loadEntries();
    const idx = entries.findIndex(e => e.id === id);
    if(idx === -1) return false;
    entries[idx] = Object.assign({}, entries[idx], updates);
    saveEntries(entries);
    return true;
  }

  function deleteEntry(id){
    let entries = loadEntries();
    const before = entries.length;
    entries = entries.filter(e => e.id !== id);
    saveEntries(entries);
    return entries.length < before;
  }

  // Returns a set of ISO dates that have at least one entry
  function dateSet(entries){
    const s = new Set();
    (entries || loadEntries()).forEach(e => s.add(String(e.date)));
    return s;
  }

  // Calculate current streak ending today
  function calculateStreak(entries){
    const set = dateSet(entries);
    let streak = 0;
    let longest = 0;

    // Compute current streak ending today
    let cursor = todayISO();
    while(set.has(cursor)){
      streak++;
      const d = new Date(cursor + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0,10);
    }

    // Compute longest streak anywhere
    // Sort dates ascending
    const sorted = Array.from(set).sort();
    let run = 0;
    for(let i=0;i<sorted.length;i++){
      if(i===0){ run = 1; } else {
        const prev = new Date(sorted[i-1] + 'T00:00:00');
        const curr = new Date(sorted[i] + 'T00:00:00');
        const diff = (curr - prev) / (24*60*60*1000);
        if(diff === 1){ run++; } else { run = 1; }
      }
      if(run > longest) longest = run;
    }

    return { current: streak, longest };
  }

  // Simple validation
  function validateEntry(content){
    if(!content || String(content).trim().length < 3){
      return { ok:false, message: 'Please enter at least a short sentence.' };
    }
    if(String(content).length > 2000){
      return { ok:false, message: 'Entry is too long. Keep it concise.' };
    }
    return { ok:true };
  }

  // Basic prompt generator with rotation
  const PROMPTS = [
    'What made you smile today?',
    'Name one small victory from today.',
    'Who are you grateful for and why?',
    'List three things that felt nourishing today.',
    'What challenged you and what did you learn?',
    'Describe a moment you want to remember.',
    'What did you do today that aligned with your values?'
  ];

  function getRandomPrompt(){
    try{
      const idx = Math.floor(Math.random() * PROMPTS.length);
      return PROMPTS[idx];
    }catch(e){
      return PROMPTS[0];
    }
  }

  // Export
  window.AppHelpers.STORAGE_KEY = STORAGE_KEY;
  window.AppHelpers.todayISO = todayISO;
  window.AppHelpers.formatDate = formatDate;
  window.AppHelpers.loadEntries = loadEntries;
  window.AppHelpers.saveEntries = saveEntries;
  window.AppHelpers.addEntry = addEntry;
  window.AppHelpers.updateEntry = updateEntry;
  window.AppHelpers.deleteEntry = deleteEntry;
  window.AppHelpers.calculateStreak = calculateStreak;
  window.AppHelpers.validateEntry = validateEntry;
  window.AppHelpers.getRandomPrompt = getRandomPrompt;
  window.AppHelpers.PROMPTS = PROMPTS;

})(window);
