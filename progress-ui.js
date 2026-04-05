AFRAME.registerComponent('progress-ui', {
  init: function () {
    this.goals = { box: 0, sphere: 0 };
    this.progress = { box: 0, sphere: 0 };
    this.startNewLevel();
  },

  startNewLevel: function () {
    // Randomize goals
    this.goals.box = Math.floor(Math.random() * 3) + 1;
    this.goals.sphere = Math.floor(Math.random() * 2) + 1;
    this.progress = { box: 0, sphere: 0 };
    this.updateUI();
  },

  // This is the function we will call from your other script
  recordScore: function (type) {
    if (this.progress[type] !== undefined) {
      this.progress[type]++;
      this.updateUI();
      this.checkWin();
    }
  },

  updateUI: function () {
    const str = `DOEL: ${this.goals.box} Blokken, ${this.goals.sphere} Ballen\n` +
                `GEVONDEN: ${this.progress.box} Blokken, ${this.progress.sphere} Ballen`;
    this.el.setAttribute('text', 'value', str);
  },

  checkWin: function () {
    if (this.progress.box >= this.goals.box && this.progress.sphere >= this.goals.sphere) {
      this.el.setAttribute('text', 'value', 'LEVEL VOLTOOID!\nPlatform leegmaken...');
      
      setTimeout(() => {
        this.clearScoredObjects();
        this.startNewLevel();
      }, 3000);
    }
  },

  clearScoredObjects: function() {
    const items = document.querySelectorAll('.interactable');
    items.forEach(item => {
      if (item.dataset.scored === "true") {
        item.parentNode.removeChild(item);
      }
    });
  }
});
