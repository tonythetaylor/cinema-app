export default function BrowseCard({ movie, onClick }: { movie: any; onClick?: () => void }) {
  return (
    <div
      className="w-40 shrink-0 cursor-pointer hover:scale-105 transition-transform"
      onClick={onClick}
    >
      <img
        src={movie.poster_url || "/fallback.jpg"}
        alt={movie.title}
        className="w-full h-60 object-cover rounded shadow"
      />
      <div className="mt-2 text-sm text-white text-center">{movie.title}</div>
    </div>
  );
}