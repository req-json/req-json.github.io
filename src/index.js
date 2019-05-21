/* global XHRMock */
import App from './app.svelte';

XHRMock.setup();

const app = new App({
  target: document.getElementById('app'),
});

export default app;
