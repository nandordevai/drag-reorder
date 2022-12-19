import { Orderable } from './Orderable.js';

const orderable = new Orderable(
    'orderable',
    (el, closest, intent) => {
        console.log(el, closest, intent.description);
    }
);
