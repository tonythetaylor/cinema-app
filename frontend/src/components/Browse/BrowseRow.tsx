import MovieCard from "./BrowseCard";

export default function BrowseRow({ title, movies, onCardClick }: { title: string; movies: any[]; onCardClick: (movie: any) => void }) {
  return (
    <div className="mt-8">
      <h2 className="text-xl text-white font-semibold mb-2 px-4">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto px-4 scrollbar-hide">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onClick={() => onCardClick(movie)} />
        ))}
      </div>
    </div>
  );
}