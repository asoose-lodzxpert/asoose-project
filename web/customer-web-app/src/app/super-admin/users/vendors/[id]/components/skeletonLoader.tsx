const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-32 bg-gray-800 rounded-xl"></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="h-96 bg-gray-800 rounded-xl"></div>
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-800 rounded-xl"></div>
          <div className="h-32 bg-gray-800 rounded-xl"></div>
        </div>
        <div className="h-96 bg-gray-800 rounded-xl"></div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader