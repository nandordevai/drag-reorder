const INTENT_BEFORE = Symbol();
const INTENT_AFTER = Symbol();
const DIRECTION_HORIZONTAL = Symbol();
const DIRECTION_VERTICAL = Symbol();

export class Orderable {
    constructor(className, startCallback, dropCallback) {
        this.className = className;
        this.element = document.querySelector(`.${this.className}`);
        this.startCallback = startCallback;
        this.dropCallback = dropCallback;
        this.addEventHandlers();
    }

    computeCentroid(element) {
        const rect = element.getBoundingClientRect();
        const viewportX = (rect.left + rect.right) / 2;
        const viewportY = (rect.top + rect.bottom) / 2;
        return { x: viewportX + window.scrollX, y: viewportY + window.scrollY };
    }

    distance(p1, p2) {
        return Math.hypot(
            p2.x - p1.x - window.scrollX,
            p2.y - p1.y - window.scrollY
        );
    }

    predictDirection(a, b) {
        if (!a || !b) return DIRECTION_HORIZONTAL;
        const dx = Math.abs(b.centroid.x - a.centroid.x);
        const dy = Math.abs(b.centroid.y - a.centroid.y);
        return dx > dy ? DIRECTION_HORIZONTAL : DIRECTION_VERTICAL;
    }

    intentFrom(direction, event, centroid) {
        if (direction === DIRECTION_HORIZONTAL) {
            return event.clientX + window.scrollX < centroid.x
                ? INTENT_BEFORE
                : INTENT_AFTER;
        } else {
            return event.clientY + window.scrollY < centroid.y
                ? INTENT_BEFORE
                : INTENT_AFTER;
        }
    }

    startReorder(element) {
        const parent = element.parentNode;
        const items = Array.from(parent.children).map((element, i) => {
            return { i, element, centroid: this.computeCentroid(element) };
        });

        const direction = this.predictDirection(items[0], items[1]);

        let closest = element;
        let intent = INTENT_AFTER;
        let marker = document.createElement(element.nodeName);
        marker.classList.add(`${this.className}__insertion-marker`);

        const onMouseMove = e => {
            e.preventDefault();

            const byDistance = items
                .map(item => {
                    return {
                        distance: this.distance(
                            { x: e.clientX, y: e.clientY }, item.centroid
                        ),
                        ...item,
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            closest = byDistance[0].element;
            intent = this.intentFrom(direction, e, byDistance[0].centroid);
            marker.remove();
            byDistance.forEach(({ element }) => {
                if (element !== closest) return;
                if (intent === INTENT_BEFORE) {
                    marker = element.insertAdjacentElement('beforebegin', marker);
                } else {
                    marker = element.insertAdjacentElement('afterend', marker);
                }
            });
        };
        parent.addEventListener('dragover', onMouseMove);

        return () => {
            marker.remove();
            parent.removeEventListener('dragover', onMouseMove);
            return { closest, intent };
        };
    }

    onDragStart(element) {
        this.startCallback(element);
        const stop = this.startReorder(element);
        element.parentNode.addEventListener('drop', event => {
            event.preventDefault();
        }, {
            once: true,
        });
        element.addEventListener('dragend', (event) => {
            event.preventDefault();
            element.classList.remove(`${this.className}__selected`);
            const { closest, intent } = stop();
            if (intent === INTENT_BEFORE) {
                closest.insertAdjacentElement('beforebegin', element);
            } else {
                closest.insertAdjacentElement('afterend', element);
            }
            this.dropCallback(element, closest, intent);
        }, {
            once: true
        });
    }

    addEventHandlers() {
        Array.from(this.element.children).forEach(element => {
            element.addEventListener('dragstart', () => { this.onDragStart(element); });
        });
    }
}
