/**
 * Explore's side panels go into their buttons when they close and come out of them when they open,
 * so it's plain where a panel went and how to get it back. Transform and opacity only.
 */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easing = 'cubic-bezier(0.2, 0, 0, 1)';
const duration = 280;

/** The transform that lays a box at `from` over `to`, from its top left corner */
function onto(from: DOMRect, to: DOMRect) {
	const x = to.left - from.left;
	const y = to.top - from.top;
	return `translate(${x}px, ${y}px) scale(${to.width / from.width}, ${to.height / from.height})`;
}

/** Closing: lifted out where it is, so the rest takes its room at once, then shrunk into its button */
export function flyInto(panel: Element, button: HTMLElement | undefined, done: () => void) {
	if (!button || reduced()) return done();
	const el = panel as HTMLElement;
	const from = el.getBoundingClientRect();
	Object.assign(el.style, {
		position: 'fixed',
		left: `${from.left}px`,
		top: `${from.top}px`,
		width: `${from.width}px`,
		height: `${from.height}px`,
		zIndex: '20',
		transformOrigin: '0 0',
		pointerEvents: 'none'
	});
	const to = button.getBoundingClientRect();
	el.animate([{ transform: 'none', opacity: 1 }, { transform: onto(from, to), opacity: 0 }], {
		duration,
		easing
	}).onfinish = () => {
		done();
		pulse(button);
	};
}

/** Opening: from its button to the place the layout has already made for it */
export function flyOutOf(panel: Element, button: HTMLElement | undefined, done: () => void) {
	if (!button || reduced()) return done();
	const el = panel as HTMLElement;
	const to = el.getBoundingClientRect();
	const from = button.getBoundingClientRect();
	el.style.transformOrigin = '0 0';
	el.animate([{ transform: onto(to, from), opacity: 0 }, { transform: 'none', opacity: 1 }], {
		duration,
		easing
	}).onfinish = () => {
		el.style.transformOrigin = '';
		done();
	};
}

/** The button a panel went into, nudged so the eye lands on it */
function pulse(button: HTMLElement) {
	if (reduced()) return;
	button.animate([{ transform: 'none' }, { transform: 'scale(1.2)' }, { transform: 'none' }], {
		duration: 320,
		easing: 'ease-out'
	});
}
