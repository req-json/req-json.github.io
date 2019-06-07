<script>
import Showcase from './showcase.svelte';

const sections = [
  {
    title: 'Basic Usage',
    code: `const reqJSON = new ReqJSON();

reqJSON.get('/api/item/:id', 1)
  .then(res => console.log(res));`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hello: 'world',
    date: new Date()
  }),
});`,
  },
  {
    title: 'Shorthand methods',
    code: `const reqJSON = new ReqJSON();

const item = await reqJSON.get('/api/item/:id', { id: 1 });
console.log('client get', item);

const res = await reqJSON.post('/api/item/:id', item);
console.log('client post', res);`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 1,
    date: new Date(),
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server receive', JSON.parse(req.body()));
  return res
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date(),
    }));
});`,
  },
  {
    title: 'RESTful API',
    code: `const reqJSON = new ReqJSON();
const resource = reqJSON.resource('/api/item/:id');

const item = await resource.get({ id: 1 });
console.log('client get', item);

const res = await resource.post(item);
console.log('client post', res);`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 1,
    date: new Date(),
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server receive', JSON.parse(req.body()));
  return res
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date(),
    }));
});`,
  },
  {
    title: 'Methods',
    description: 'Supports GET POST PUT DELETE methods.',
    code: `const reqJSON = new ReqJSON();
const resource = reqJSON.resource('/api/item/:id');

const id = 1;
let item;
console.log({
  get: item = await resource.get(id),
  post: await resource.post(item),
  put: await resource.put(item),
  delete: await resource.delete(id),
});`,
    mock: `const mock = (method, body) => XHRMock[method]('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
    
[ 'get', 'delete' ].forEach(method => mock(method, {
  id: 1,
  date: new Date(),
}));

[ 'post', 'put' ].forEach(method => mock(method, {
  updateAt: new Date(),
}));`,
  },
];
</script>

<div class="container">
  <h1 class="text-center">REQ-JSON</h1>
  {#each sections as section}
    <Showcase {...section}></Showcase>
  {/each}
</div>
