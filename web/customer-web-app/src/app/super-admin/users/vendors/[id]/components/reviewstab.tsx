import { Star, Trash2, Mail } from "lucide-react";
import Swal from "sweetalert2";

interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
  orderId: string;
}

const ReviewsTab = ({ reviews }: { reviews: Review[] }) => {
  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Delete Review?",
      text: "Remove this review from the platform?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      background: "#1E293B",
      color: "#fff",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Deleted",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
          confirmButtonColor: "#eab308",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Customer Feedback</h3>
        <div className="flex items-center gap-2 text-yellow-500 font-bold bg-yellow-500/10 px-3 py-1 rounded-lg">
          <Star className="w-4 h-4 fill-yellow-500" /> 4.8 Average
        </div>
      </div>
      <div className="grid gap-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-[#0F172A] border border-gray-800 p-4 rounded-xl hover:border-gray-700 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{review.user}</span>
                <span className="text-xs text-gray-500">
                  • {review.orderId}
                </span>
              </div>
              <span className="text-xs text-gray-500">{review.date}</span>
            </div>
            <div className="flex text-yellow-500 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < review.rating ? "fill-yellow-500" : "text-gray-700"}`}
                />
              ))}
            </div>
            <p className="text-gray-300 text-sm mb-3">"{review.comment}"</p>
            <div className="flex gap-3 border-t border-gray-800 pt-3">
              <button
                onClick={() => handleDelete(review.id)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
              >
                <Trash2 className="w-3 h-3" /> Remove Review
              </button>
              <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold">
                <Mail className="w-3 h-3" /> Contact User
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsTab;
