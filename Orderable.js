const INTENT_BEFORE = Symbol();
const INTENT_AFTER = Symbol();
const DIRECTION_HORIZONTAL = Symbol();
const DIRECTION_VERTICAL = Symbol();

export class Orderable {
    constructor(element) {
        this.element = element;
        this.addEventHandlers();
    }

    // Compute the centroid of an element in page coordinates
    // (from the top-left of the page, accounting for the scroll).
    computeCentroid(element) {
        const rect = element.getBoundingClientRect();
        const viewportX = (rect.left + rect.right) / 2;
        const viewportY = (rect.top + rect.bottom) / 2;
        return { x: viewportX + window.scrollX, y: viewportY + window.scrollY };
    }

    distanceBetweenCursorAndPoint(evt, centroid) {
        return Math.hypot(
            centroid.x - evt.clientX - window.scrollX,
            centroid.y - evt.clientY - window.scrollY
        );
    }

    predictDirection(a, b) {
        if (!a || !b) return DIRECTION_HORIZONTAL;
        const dx = Math.abs(b.centroid.x - a.centroid.x);
        const dy = Math.abs(b.centroid.y - a.centroid.y);
        return dx > dy ? DIRECTION_HORIZONTAL : DIRECTION_VERTICAL;
    }

    intentFrom(direction, evt, centroid) {
        if (direction === DIRECTION_HORIZONTAL) {
            return evt.clientX + window.scrollX < centroid.x
                ? INTENT_BEFORE
                : INTENT_AFTER;
        } else {
            return evt.clientY + window.scrollY < centroid.y
                ? INTENT_BEFORE
                : INTENT_AFTER;
        }
    }

    startReorderWithElement(el) {
        const parent = el.parentNode;
        const orderables = Array.from(parent.children).map((element, i) => {
            return { i, element, centroid: this.computeCentroid(element) };
        });

        // Determine the dominant direction in the list - is it horizontal or vertical?
        const direction = this.predictDirection(orderables[0], orderables[1]);

        let closest = el;
        let intent = INTENT_AFTER;
        let marker = document.createElement(el.nodeName);
        marker.classList.add('insertion-marker');

        const unstyle = () => {
            orderables.forEach(({ element }) => {
                element.classList.remove('reorder-accepts-before');
                element.classList.remove('reorder-accepts-after');
            });
        };

        const mouseMoveHandler = evt => {
            evt.preventDefault();

            const byDistance = orderables
                .map(orderable => {
                    return {
                        distance: this.distanceBetweenCursorAndPoint(
                            evt,
                            orderable.centroid
                        ),
                        ...orderable,
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            closest = byDistance[0].element;
            intent = this.intentFrom(direction, evt, byDistance[0].centroid);

            unstyle();
            marker.remove();

            byDistance.forEach(({ element }) => {
                if (element !== closest) return;
                if (intent === INTENT_BEFORE) {
                    marker = element.insertAdjacentElement('beforebegin', marker);
                    element.classList.add('reorder-accepts-before');
                } else {
                    marker = element.insertAdjacentElement('afterend', marker);
                    element.classList.add('reorder-accepts-after');
                }
            });
        };
        parent.addEventListener('dragover', mouseMoveHandler);

        const stopFn = () => {
            unstyle();
            marker.remove();
            parent.removeEventListener('dragover', mouseMoveHandler);
            return { closest, intent };
        };

        return stopFn;
    }

    addEventHandlers() {
        Array.from(this.element.children).forEach(item => {
            item.addEventListener('dragstart', () => {
                item.classList.add('selected');
                const stop = this.startReorderWithElement(item);
                item.parentNode.addEventListener('drop', e => { e.preventDefault(); }, {
                    once: true,
                });
                item.addEventListener('dragend', (e) => {
                    e.preventDefault();
                    item.classList.remove('selected');
                    const { closest, intent } = stop();
                    if (intent === INTENT_BEFORE) {
                        closest.insertAdjacentElement('beforebegin', item);
                    } else {
                        closest.insertAdjacentElement('afterend', item);
                    }
                },
                { once: true }
                );
            });
        });
    }
}
