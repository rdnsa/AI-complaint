/**
 * Two clear glass droplets in the empty margins beside the content. Only on
 * wide screens: on a phone there is no margin, and they would sit on the cards.
 */
export default function Ambient() {
  return (
    <div aria-hidden className="hidden print:hidden xl:block">
      <span className="droplet" style={{ left: '2.5vw', top: '34vh', width: 118, height: 112 }} />
      <span className="droplet" style={{ right: '3vw', bottom: '12vh', width: 96, height: 98 }} />
    </div>
  );
}
