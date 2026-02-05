import React from "react";
import { Star } from "lucide-react";

interface RatingsProps {
  ratings: { star: number; percentage: number }[];
  avgRating: number;
}

export default function RatingsDistribution({
  ratings,
  avgRating,
}: RatingsProps) {
  return (
    <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
      <h3 className="font-bold text-white mb-6">User Ratings Distribution</h3>
      <div className="space-y-4">
        {ratings.map((item) => (
          <div key={item.star} className="flex items-center gap-3">
            <span className="text-sm font-bold w-4 text-white">
              {item.star}
            </span>
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-yellow-500"
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">
              {Math.round(item.percentage)}%
            </span>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <div className="text-4xl font-black text-white">{avgRating}</div>
        <div className="flex justify-center gap-1 my-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Average rating based on 12,450 reviews
        </p>
      </div>
    </div>
  );
}
