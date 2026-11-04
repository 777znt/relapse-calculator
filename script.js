(() => {
  const display = document.getElementById("display");
  const song = document.getElementById("song");
  const buttons = document.querySelectorAll(".btn");

  let currentValue = "0";
  let previousValue = null;
  let operator = null;
  let shouldResetDisplay = false;
  let justEvaluated = false;
  let isAnimating = false;
  let animationTimeouts = [];

  // The lyric sequence that plays on =
  const lyricSequence = [
    { text: "ako..", hold: 800, clearAfter: true },
    { text: "ako... ako ang bagyooooooo,", hold: 4000, clearAfter: true },
    { text: "kulimlim ang langit sa inyong dalawa.", hold: 3500, clearAfter: true },
    { text: "bulong ko sa hangin sana di kayo masaya, sa tibay ng bahay tinitirahan nyo, tatangayin ko bawat yero", hold: 6000, clearAfter: false }
  ];

  function clearAllTimeouts() {
    animationTimeouts.forEach(clearTimeout);
    animationTimeouts = [];
  }

  function typeText(text, speed = 55) {
    return new Promise((resolve) => {
      display.textContent = "";
      display.classList.add("special");
      let i = 0;

      function typeNext() {
        if (i < text.length) {
          display.textContent += text[i];
          i++;
          // Auto-shrink if needed while typing
          fitText();
          const t = setTimeout(typeNext, speed);
          animationTimeouts.push(t);
        } else {
          resolve();
        }
      }
      typeNext();
    });
  }

  function fitText() {
    display.style.fontSize = "";
    requestAnimationFrame(() => {
      const container = display.parentElement;
      if (display.scrollWidth > container.clientWidth - 16) {
        const scale = (container.clientWidth - 16) / display.scrollWidth;
        const currentSize = parseFloat(getComputedStyle(display).fontSize);
        display.style.fontSize = `${Math.max(16, currentSize * scale * 0.95)}px`;
      }
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      animationTimeouts.push(t);
    });
  }

  async function playLyricSequence() {
    if (isAnimating) return;
    isAnimating = true;
    clearAllTimeouts();

    // Disable buttons during animation
    buttons.forEach(b => b.style.pointerEvents = "none");

    try {
      for (const step of lyricSequence) {
        await typeText(step.text, 50);
        await sleep(step.hold);
        if (step.clearAfter) {
          display.textContent = "";
          await sleep(300);
        }
      }
    } finally {
      isAnimating = false;
      buttons.forEach(b => b.style.pointerEvents = "");
      justEvaluated = true;
      shouldResetDisplay = true;
    }
  }

  function formatDisplay(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";

    let str = value.toString();

    if (str.length > 9 && !str.includes("e")) {
      if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
        str = num.toExponential(5);
      } else {
        const parts = str.split(".");
        if (parts[1]) {
          const maxDec = Math.max(0, 9 - parts[0].length - 1);
          str = num.toFixed(maxDec).replace(/\.?0+$/, "");
        }
      }
    }
    return str;
  }

  function updateDisplay(value) {
    if (isAnimating) return;
    const text = formatDisplay(value);
    display.textContent = text;
    display.classList.remove("special");
    display.style.fontSize = "";
    fitText();
  }

  function clearAll() {
    clearAllTimeouts();
    isAnimating = false;
    buttons.forEach(b => b.style.pointerEvents = "");
    currentValue = "0";
    previousValue = null;
    operator = null;
    shouldResetDisplay = false;
    justEvaluated = false;
    updateDisplay(currentValue);
    clearOperatorHighlight();
    const clearBtn = document.querySelector('[data-action="clear"]');
    if (clearBtn) clearBtn.textContent = "AC";
  }

  function clearEntry() {
    if (isAnimating) return;
    currentValue = "0";
    shouldResetDisplay = false;
    updateDisplay(currentValue);
    const clearBtn = document.querySelector('[data-action="clear"]');
    if (clearBtn) clearBtn.textContent = "AC";
  }

  function clearOperatorHighlight() {
    document.querySelectorAll(".btn.operator").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  function highlightOperator(action) {
    clearOperatorHighlight();
    const btn = document.querySelector(`[data-action="${action}"]`);
    if (btn && action !== "equals") {
      btn.classList.add("active");
    }
  }

  function inputNumber(num) {
    if (isAnimating) return;
    if (justEvaluated) {
      currentValue = "0";
      previousValue = null;
      operator = null;
      justEvaluated = false;
    }

    if (shouldResetDisplay || currentValue === "0") {
      currentValue = num === "." ? "0." : num;
      shouldResetDisplay = false;
    } else {
      if (num === "." && currentValue.includes(".")) return;
      if (currentValue.replace(".", "").length >= 9) return;
      currentValue += num;
    }

    updateDisplay(currentValue);

    const clearBtn = document.querySelector('[data-action="clear"]');
    if (clearBtn) clearBtn.textContent = "C";
  }

  function inputOperator(op) {
    if (isAnimating) return;
    if (justEvaluated) {
      justEvaluated = false;
    }

    if (operator && !shouldResetDisplay) {
      calculate();
    }

    previousValue = currentValue;
    operator = op;
    shouldResetDisplay = true;
    highlightOperator(op);
  }

  function calculate() {
    if (operator === null || previousValue === null) return;

    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    let result;

    switch (operator) {
      case "add":
        result = prev + curr;
        break;
      case "subtract":
        result = prev - curr;
        break;
      case "multiply":
        result = prev * curr;
        break;
      case "divide":
        result = curr === 0 ? "Error" : prev / curr;
        break;
      default:
        return;
    }

    if (result === "Error") {
      currentValue = "Error";
    } else {
      result = Math.round(result * 1e10) / 1e10;
      currentValue = String(result);
    }

    previousValue = null;
    operator = null;
    shouldResetDisplay = true;
    clearOperatorHighlight();
  }

  function toggleSign() {
    if (isAnimating) return;
    if (currentValue === "0" || currentValue === "Error") return;
    if (currentValue.startsWith("-")) {
      currentValue = currentValue.slice(1);
    } else {
      currentValue = "-" + currentValue;
    }
    updateDisplay(currentValue);
  }

  function percent() {
    if (isAnimating) return;
    const num = parseFloat(currentValue);
    if (isNaN(num)) return;
    currentValue = String(num / 100);
    updateDisplay(currentValue);
    shouldResetDisplay = true;
  }

  function handleEquals() {
    if (isAnimating) return;

    if (operator !== null) {
      calculate();
    }

    justEvaluated = true;
    shouldResetDisplay = true;
    operator = null;
    previousValue = null;
    clearOperatorHighlight();

    // Play song + start typing sequence
    playSong();
    playLyricSequence();
  }

  function playSong() {
    if (!song) return;
    try {
      song.currentTime = 0;
      const playPromise = song.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (e) {}
  }

  // Button event listeners
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const action = btn.dataset.action;
      const value = btn.dataset.value;

      if (value !== undefined) {
        inputNumber(value);
        return;
      }

      switch (action) {
        case "clear":
          if (btn.textContent === "C" && !isAnimating) {
            clearEntry();
          } else {
            clearAll();
          }
          break;
        case "plus-minus":
          toggleSign();
          break;
        case "percent":
          percent();
          break;
        case "add":
        case "subtract":
        case "multiply":
        case "divide":
          inputOperator(action);
          break;
        case "equals":
          handleEquals();
          break;
      }
    });
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (isAnimating) return;
    const key = e.key;

    if (/[0-9]/.test(key)) {
      inputNumber(key);
    } else if (key === ".") {
      inputNumber(".");
    } else if (key === "+") {
      inputOperator("add");
    } else if (key === "-") {
      inputOperator("subtract");
    } else if (key === "*" || key === "x") {
      inputOperator("multiply");
    } else if (key === "/") {
      e.preventDefault();
      inputOperator("divide");
    } else if (key === "Enter" || key === "=") {
      e.preventDefault();
      handleEquals();
    } else if (key === "Escape" || key === "c" || key === "C") {
      clearAll();
    } else if (key === "%") {
      percent();
    } else if (key === "Backspace") {
      if (currentValue.length > 1) {
        currentValue = currentValue.slice(0, -1);
      } else {
        currentValue = "0";
      }
      updateDisplay(currentValue);
    }
  });

  updateDisplay(currentValue);

  // Prevent double-tap zoom on mobile
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, false);
})();
