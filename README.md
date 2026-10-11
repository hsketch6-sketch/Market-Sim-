# Market Sim — GitHub Pages Edition

This is the static, browser-only edition of the fictional 30-year stock market simulation. It requires no Node.js server, build step, npm packages, or external API.

## Deploy to GitHub Pages

1. Create or open a GitHub repository.
2. Upload `index.html` to the repository root (the same level as this README).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose your branch (usually `main`) and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site and open the URL shown in Settings → Pages.

## Important limitation

GitHub Pages serves static files only. This edition runs the market engine in each visitor's browser and saves that visitor's progress in `localStorage`. It includes 100 fictional companies, 10 themes, clue/public news, theme spillovers, 12 bots, trading, FOMO, and a 7,560-trading-day timeline.

**It is not shared multiplayer:** different visitors have different markets and portfolios. To make everyone share one live market, you need a separate backend/database service (for example, a hosted API plus persistent storage). GitHub Pages alone cannot provide that shared server state.

Use the in-page **Reset** button to start a new local market. Clearing browser site data also removes saved progress.
