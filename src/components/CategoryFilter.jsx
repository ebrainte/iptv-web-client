export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
          !selected
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.category_id}
          onClick={() => onSelect(cat.category_id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selected === cat.category_id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {cat.category_name}
        </button>
      ))}
    </div>
  )
}
