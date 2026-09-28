import { getInitials } from '../../utils/format';

export default function Avatar({ name, color, size = 44 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundColor: color || '#6D4AFF',
      }}
    >
      {getInitials(name)}
    </div>
  );
}