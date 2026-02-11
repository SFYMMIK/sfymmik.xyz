(() => {
  document.addEventListener("DOMContentLoaded", () => {
    // --- Quotes list ---
    const QUOTES = [
      { t: "Reality is just undefined behavior.", a: "someone who forgot -Wall" },
      { t: "If it compiles, it’s correct until it isn’t.", a: "CI pipeline" },
      { t: "It worked yesterday, so I changed nothing.", a: "the git blame" },
      { t: "I didn’t break it. I removed an assumption.", a: "refactor energy" },
      { t: "There is no cloud. There is only someone else’s computer.", a: "ops wisdom" },
      { t: "My code is self-documenting. Unfortunately, it’s written in sarcasm.", a: "maintainer" },
      { t: "The bug is in the last place you look. Because you stop looking.", a: "ancient proverb" },
      { t: "We can ship now and debug later. The customers will help.", a: "startup speedrun" },
      { t: "I love deadlines. I like the whooshing sound they make as they fly by.", a: "Douglas Adams (kinda)" },
      { t: "A feature is a bug with marketing.", a: "product" },
      { t: "Everything is a trade-off, except sleep. Sleep is just gone.", a: "student dev" },
      { t: "It’s not tech debt if you never plan to pay it.", a: "management" },
      { t: "The logs are always right. Unless they aren’t.", a: "observability" },
      { t: "Nothing is more permanent than a temporary workaround.", a: "every sysadmin" },
      { t: "Move fast and break things. Then move slower and write postmortems.", a: "timeline" },
      { t: "If you can’t reproduce it, it’s a feature.", a: "QA nightmare" },
      { t: "The solution is simple. The implementation is cursed.", a: "architect" },
      { t: "Your keyboard is an API to chaos.", a: "terminal user" },
      { t: "I have 99 problems and they’re all in production.", a: "on-call" },
      { t: "The build succeeded. That’s suspicious.", a: "nightly" },
      { t: "I can explain it, but I can’t understand it for you.", a: "senior dev" },
      { t: "A good commit message is a love letter to future you.", a: "git poet" },
      { t: "The server is up. The service is not. This is fine.", a: "SRE" },
      { t: "Sometimes the best optimization is turning it off and on again.", a: "support legend" },
      { t: "We don’t have bugs. We have undocumented features.", a: "classic cope" },
      { t: "If it’s slow, add a loading spinner. Users love honesty.", a: "UX crime" },
      { t: "There are two hard things: naming things, cache invalidation, and off-by-one.", a: "everybody" },
      { t: "I measured it. It got worse. So I stopped measuring.", a: "performance" },
      { t: "I chose stability. Then I installed updates.", a: "pain" },
      { t: "The codebase is a museum. Please don’t touch the exhibits.", a: "legacy keeper" },
      { t: "A clean desktop is a sign of a broken workflow.", a: "someone busy" },
      { t: "I didn’t choose the shell life. The shell life chose me.", a: "terminal gremlin" },
      { t: "You can’t spell ‘feature’ without ‘fear’. Actually you can. But still.", a: "anxiety" },
      { t: "If you need a reason, it’s already too late.", a: "debugging" },
      { t: "I wrote it at 3AM. It runs at 3AM. That is the contract.", a: "automation" },
      { t: "There is elegance in deleting 500 lines.", a: "minimalist" },
      { t: "The faster the fix, the slower the consequences.", a: "wisdom" },
      { t: "My favorite framework is ‘whatever works today’.", a: "pragmatist" },
      { t: "When in doubt, blame DNS.", a: "networking" },
      { t: "It’s always DNS. Even when it’s not.", a: "still networking" },
      { t: "The UI is done when it looks correct from 2 meters away.", a: "frontend" },
      { t: "I replaced a dependency with 300 lines of regret.", a: "vendor lock-in escapee" },
      { t: "The patch is small. The blast radius is not.", a: "release notes" },
      { t: "A restart is just a confession with extra steps.", a: "service manager" },
      { t: "If you didn’t document it, you didn’t do it.", a: "future you" },
      { t: "We don’t test in production. Production tests us.", a: "folklore" },
      { t: "It’s not broken; it’s just resting.", a: "dead service" },
      { t: "I have a plan. It’s called ‘winging it’.", a: "developer" },
      { t: "The perfect config is one edit away from disaster.", a: "dotfiles" },
      { t: "I added dark mode. The bugs are now harder to see.", a: "victory" },
      { t: "Compiling is just waiting with extra optimism.", a: "Gentoo user" },
      { t: "If it takes hours, it’s because it’s high quality. Probably.", a: "compile flags enjoyer" },
      { t: "I wrote my own tool to avoid learning the existing one.", a: "engineer mindset" },
      { t: "Security is a feature until you want convenience.", a: "truth" },
      { t: "I will fix it later. Later is a mythical place.", a: "backlog" },
      { t: "The best code is no code. The second best is code you can delete.", a: "simplifier" },
      { t: "If the documentation is perfect, it’s definitely outdated.", a: "docs" },
      { t: "I tried to be clever. Now I’m being sorry.", a: "postmortem" },
      { t: "My roadmap is a collection of beautiful lies.", a: "planning" },
      { t: "The only true constant is an unhandled edge case.", a: "math but worse" },
      { t: "Every refactor starts with hope and ends with git stash.", a: "experience" },
      { t: "I’m not procrastinating. I’m caching my motivation.", a: "me, rn" },
      { t: "If you see this quote twice, congrats: you found determinism.", a: "RNG" },
      { t: "There is no ‘final’ version. Only release candidates.", a: "software" },
      { t: "I pressed one key and learned humility.", a: "rm -rf" },
      { t: "The code doesn’t lie. But it can definitely mislead.", a: "debugger" },
      { t: "Sometimes the fix is deleting the ‘smart’ part.", a: "sane dev" },
      { t: "I want simple. My requirements disagree.", a: "everyone" },
      { t: "If your site has a counter, it’s instantly 30% cooler.", a: "retro web law" },
      { t: "This website is powered by vibes and mild panic.", a: "footer material" },
      { t: "I use arch btw. This is not a personality. It’s a warning.", a: "meme" },
      { t: "I installed FreeBSD for stability. Then I met myself.", a: "user error" },
      { t: "A tunnel to the internet is just a very fancy ‘pls work’.", a: "cloudflared" },
      { t: "The quickest way to find a bug is to show someone else.", a: "rubber duck" },
      { t: "I don’t always test my code, but when I do, it’s in prod.", a: "legend" }
    ];

    // Optional: fake author list (for cursed mode)
    const FAKE_AUTHORS = [
      "kernel whisperer",
      "malloc enjoyer",
      "the void (null)",
      "a suspicious config file",
      "man page footnote",
      "future you, angry",
      "a CPU at 127°C",
      "the /var/log prophet",
      "the forbidden printf"
    ];

    const elText = document.getElementById("quoteText");
    const elAuthor = document.getElementById("quoteAuthor");
    const btn = document.getElementById("newQuoteBtn");

    if (!elText || !elAuthor) {
      console.error("[quotes] Missing #quoteText or #quoteAuthor in HTML");
      return;
    }

    function randInt(n) {
      return Math.floor(Math.random() * n);
    }

    // Avoid showing the same quote twice in a row
    let lastIndex = -1;

    function pickQuote() {
      if (QUOTES.length === 0) return { t: "No quotes configured.", a: "" };

      let i = randInt(QUOTES.length);
      if (QUOTES.length > 1) {
        while (i === lastIndex) i = randInt(QUOTES.length);
      }
      lastIndex = i;

      const q = QUOTES[i];

      // 12% chance to replace author with something cursed
      const cursed = Math.random() < 0.12;
      const author = cursed ? FAKE_AUTHORS[randInt(FAKE_AUTHORS.length)] : (q.a || "");

      return { t: q.t, a: author };
    }

    function render() {
      const q = pickQuote();
      elText.textContent = `“${q.t}”`;
      elAuthor.textContent = q.a ? `— ${q.a}` : "";
    }

    if (btn) btn.addEventListener("click", render);

    render();

  });
})();