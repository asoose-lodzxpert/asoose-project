import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import Swal from "sweetalert2";

interface AdminNote {
  id: string;
  admin: string;
  note: string;
  date: string;
}

const AdminNotesSection = ({ notes }: { notes: AdminNote[] }) => {
  const [newNote, setNewNote] = useState("");

  const addNote = () => {
    if (!newNote) return;
    Swal.fire({
      title: "Note Added",
      icon: "success",
      background: "#1E293B",
      color: "#fff",
    });
    setNewNote("");
  };

  return (
    <div className="mt-8 bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-orange-500" /> Internal Admin Notes
      </h3>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a private note regarding this vendor..."
            className="flex-1 bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
          />
          <button
            onClick={addNote}
            className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400"
          >
            Add Note
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-[#0F172A] p-3 rounded-lg border-l-4 border-yellow-500"
            >
              <p className="text-sm text-gray-300">{note.note}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Added by {note.admin} • {note.date}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminNotesSection;
