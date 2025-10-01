(function(window, $){
  'use strict';

  window.App = window.App || {};

  // App namespace for UI rendering and event management
  App.init = function(){
    // Cache elements
    App.$ = {
      todayDate: $('#today-date'),
      prompt: $('#prompt'),
      entry: $('#entry'),
      btnSave: $('#btn-save'),
      btnQuick: $('#btn-quick'),
      btnSkip: $('#btn-skip'),
      btnNewPrompt: $('#btn-new-prompt'),
      btnCopyPrompt: $('#btn-copy-prompt'),
      entriesList: $('#entries-list'),
      streakCount: $('#streak-count'),
      totalDays: $('#total-days'),
      longestStreak: $('#longest-streak'),
      filter: $('#filter'),
      promptBank: $('#prompt-bank'),
      formFeedback: $('#form-feedback'),
      btnReset: $('#btn-reset'),
      btnHelp: $('#btn-help')
    };

    // Key bindings
    $(document).on('keydown', function(e){
      if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
        e.preventDefault(); App.$.btnSave.trigger('click');
      }
      if(e.altKey && (e.key === 'p' || e.key === 'P')){
        e.preventDefault(); App.newPrompt();
      }
    });

    // Form submission
    $('#entry-form').on('submit', function(ev){
      ev.preventDefault();
      App.saveEntry();
    });

    // Buttons
    App.$.btnQuick.on('click', function(){
      const sample = AppHelpers.getRandomPrompt();
      const quick = sample + ' I am grateful for...';
      App.$.entry.val(quick);
      App.showFeedback('Quick entry filled. Edit or save.', 'info');
    });

    App.$.btnSkip.on('click', function(){
      App.showFeedback('You skipped today. That is okay. You can add later.', 'info');
      // Do not modify storage on skip
    });

    App.$.btnNewPrompt.on('click', function(){
      App.newPrompt();
    });

    App.$.btnCopyPrompt.on('click', function(){
      const t = App.$.prompt.val();
      if(!t) return;
      // copy to clipboard (graceful)
      try{
        navigator.clipboard && navigator.clipboard.writeText(t);
        App.showFeedback('Prompt copied to clipboard.', 'info');
      }catch(e){
        App.showFeedback('Unable to copy. You can select and copy manually.', 'warn');
      }
    });

    // Filter change
    App.$.filter.on('change', function(){ App.render(); });

    // Reset
    App.$.btnReset.on('click', function(){
      if(!confirm('Reset journal? This will delete all local entries.')) return;
      localStorage.removeItem(AppHelpers.STORAGE_KEY);
      App.showFeedback('All entries removed.', 'info');
      App.render();
    });

    // Help
    App.$.btnHelp.on('click', function(){
      alert('Tips:\n- Use Ctrl+Enter to save.\n- Alt+P for a new prompt.\n- Entries are saved locally in your browser.');
    });

    // Delegated actions: edit / delete
    App.$.entriesList.on('click', '.btn-edit', function(){
      const id = $(this).closest('.entry-item').data('id');
      App.loadIntoEditor(id);
    });

    App.$.entriesList.on('click', '.btn-delete', function(){
      const id = $(this).closest('.entry-item').data('id');
      if(!confirm('Delete this entry?')) return;
      const ok = AppHelpers.deleteEntry(id);
      if(ok){
        App.showFeedback('Entry deleted.', 'info');
        App.render();
      } else {
        App.showFeedback('Could not delete entry.', 'warn');
      }
    });

    // Provide prompt bank
    App.renderPromptBank();

    // Accessibility: ensure main interactive elements are focusable in a logical order
    $('#prompt, #entry, #btn-save, #btn-quick').attr('tabindex', '0');
  };

  App.newPrompt = function(){
    const p = AppHelpers.getRandomPrompt();
    App.$.prompt.val(p);
    App.showFeedback('New prompt ready. You can edit it before saving.', 'info');
    // Gentle animate draw attention
    App.$.prompt.addClass('pulse');
    setTimeout(() => App.$.prompt.removeClass('pulse'), 700);
  };

  App.showFeedback = function(message, level){
    const $fb = App.$.formFeedback;
    $fb.text(message);
    if(level === 'warn') $fb.css('color', '#b45309'); else $fb.css('color', '');
    // fade effect
    $fb.stop(true,true).fadeTo(200,1).delay(1500).fadeTo(300,0.9);
  };

  App.saveEntry = function(){
    try{
      const content = App.$.entry.val();
      const prompt = App.$.prompt.val();
      const v = AppHelpers.validateEntry(content);
      if(!v.ok){
        App.showFeedback(v.message, 'warn');
        return;
      }
      const date = AppHelpers.todayISO();
      const item = AppHelpers.addEntry({ date, content, prompt });
      App.showFeedback('Saved. Great work.', 'info');
      App.$.entry.val('');
      App.render();
    }catch(e){
      console.error('Save failed', e);
      App.showFeedback('Save failed. See console for details.', 'warn');
    }
  };

  App.loadIntoEditor = function(id){
    const entries = AppHelpers.loadEntries();
    const item = entries.find(e => e.id === id);
    if(!item) { App.showFeedback('Entry not found.', 'warn'); return; }
    App.$.entry.val(item.content);
    App.$.prompt.val(item.prompt || '');

    // Provide an update flow: change save button to update
    App.$.btnSave.text('Update').data('editing', id);

    // Bind temporary update handler
    const once = function(ev){
      ev.preventDefault();
      const id = App.$.btnSave.data('editing');
      const content = App.$.entry.val();
      const v = AppHelpers.validateEntry(content);
      if(!v.ok){ App.showFeedback(v.message, 'warn'); return; }
      const ok = AppHelpers.updateEntry(id, { content: content, prompt: App.$.prompt.val() });
      if(ok){
        App.showFeedback('Entry updated.', 'info');
        App.$.btnSave.text('Save').removeData('editing');
        App.render();
        $('#entry-form').off('submit', once);
      } else {
        App.showFeedback('Could not update entry.', 'warn');
      }
    };

    $('#entry-form').off('submit');
    $('#entry-form').on('submit', once);
  };

  App.renderPromptBank = function(){
    const bank = AppHelpers.PROMPTS;
    const $bank = App.$.promptBank.empty();
    bank.forEach(p => {
      const $el = $(`<div class=\"p-2 rounded-md hover:bg-gray-50 cursor-pointer\">${p}</div>`);
      $el.on('click', function(){ App.$.prompt.val(p); App.showFeedback('Prompt selected.', 'info'); });
      $bank.append($el);
    });
  };

  App.render = function(){
    try{
      // Date label
      App.$.todayDate.text(AppHelpers.formatDate(AppHelpers.todayISO()));

      const all = AppHelpers.loadEntries().sort((a,b)=> b.date.localeCompare(a.date) || (b.createdAt||'').localeCompare(a.createdAt||''));

      // Streak and stats
      const stats = AppHelpers.calculateStreak(all);
      App.$.streakCount.text(stats.current);
      App.$.longestStreak.text(stats.longest);
      App.$.totalDays.text(new Set(all.map(e => e.date)).size);

      // Update ring visual using conic gradient based on current streak vs longest (visual only)
      const ring = $('.ring-visual');
      const ratio = stats.longest > 0 ? Math.min(1, stats.current / stats.longest) : 0;
      const degrees = Math.round(ratio * 360);
      ring.css('background', `conic-gradient(var(--accent) 0deg, var(--accent) ${degrees}deg, rgba(243,244,246,1) ${degrees}deg)`);

      // Filter
      const filter = App.$.filter.val();
      let filtered = all;
      if(filter === 'last7'){
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        const iso = cutoff.toISOString().slice(0,10);
        filtered = all.filter(e => e.date >= iso);
      } else if(filter === 'last30'){
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
        const iso = cutoff.toISOString().slice(0,10);
        filtered = all.filter(e => e.date >= iso);
      }

      // Render entries grouped by date
      const $list = App.$.entriesList.empty();
      if(filtered.length === 0){
        $list.append(`<div class=\"text-muted\">No entries yet. Start with the prompt above.</div>`);
      } else {
        // Group by date
        const grouped = {};
        filtered.forEach(e => { grouped[e.date] = grouped[e.date] || []; grouped[e.date].push(e); });
        Object.keys(grouped).sort((a,b)=> b.localeCompare(a)).forEach(date => {
          const head = $(`<div class=\"text-sm font-semibold mt-2 mb-1\">${AppHelpers.formatDate(date)}</div>`);
          $list.append(head);
          grouped[date].forEach(item => {
            const $item = $(
              `
              <div class=\"entry-item\" data-id=\"${item.id}\"> 
                <div class=\"entry-meta\">${item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                <div class=\"entry-content\">${$('<div>').text(item.content).html()}</div>
                <div class=\"entry-actions\">
                  <button class=\"btn-icon btn-edit\" title=\"Edit\" aria-label=\"Edit entry\">Edit</button>
                  <button class=\"btn-icon btn-delete\" title=\"Delete\" aria-label=\"Delete entry\">Delete</button>
                </div>
              </div>
            `);
            $list.append($item);
          });
        });
      }

      // Set a gentle default prompt if empty
      if(!App.$.prompt.val()){
        App.$.prompt.val(AppHelpers.getRandomPrompt());
      }

    }catch(e){
      console.error('Render failed', e);
      App.showFeedback('Render failed. See console.', 'warn');
    }
  };

})(window, jQuery);
