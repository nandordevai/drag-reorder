import { Orderable } from './Orderable.js';

const orderable = new Orderable(
    'orderable',
    (el) => {
        el.classList.add('orderable__selected');
    },
    (el, closest, intent) => {
        console.log(`${el.textContent} ${intent.description} ${closest.textContent}`);
    }
);
