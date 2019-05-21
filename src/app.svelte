<script>
import Showcase from './showcase.svelte';

const sections = [
  {
    title: 'Basic Usage',
    code: `const reqJSON = new ReqJSON();

reqJSON.get('/api/item/:id', 1)
  .then(res => console.log(res));`,
    mock: `XHRMock.get('/api/item/1', {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    hello: 'world',
    date: new Date()
  }),
});`
  },
  {
    title: 'Shorthand methods',
    code: `const reqJSON = new ReqJSON();

const item = await reqJSON.get('/api/item/:id', {
  id: 1
});
const res = await reqJSON.post('/api/item/:id', item);

console.log('client', res);`,
    mock: `XHRMock.get('/api/item/1', {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 1,
    hello: 'world'
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server', JSON.parse(req.body()));
  return res
    .status(200)
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date()
    }));
});`
  }
];
</script>

<div class="container">
  <h1 class="text-center">REQ-JSON</h1>
  {#each sections as section}
    <Showcase {...section}></Showcase>
  {/each}
</div>
