import {
  Upload,
  FileCheck,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";

interface Document {
  name: string;
  file: string;
  status: "Verified" | "Pending" | "Rejected";
  uploadedDate: string;
}

const DocumentsTab = ({ documents, onVerify, onReject }: any) => {
  const handleUpload = async () => {
    const result = await Swal.fire({
      title: "Upload Document",
      html: `
        <input type="text" id="docName" class="swal2-input" placeholder="Document Name">
        <input type="file" id="docFile" class="swal2-file" style="margin-top: 10px;">
      `,
      showCancelButton: true,
      confirmButtonText: "Upload",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      background: "#1E293B",
      color: "#fff",
      preConfirm: () => {
        const name = (document.getElementById("docName") as HTMLInputElement)
          .value;
        if (!name) {
          Swal.showValidationMessage("Please enter document name");
        }
        return { name };
      },
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "Success!",
        text: "Document uploaded successfully",
        icon: "success",
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Document Verification</h3>
        {/* <button 
          onClick={handleUpload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-2 transition-all"
        >
          <Upload className="w-4 h-4" /> Upload New
        </button> */}
      </div>

      <div className="space-y-3">
        {documents.map((doc: Document, idx: number) => (
          <div
            key={idx}
            className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    doc.status === "Verified"
                      ? "bg-green-500/10 text-green-500"
                      : doc.status === "Pending"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                  }`}
                >
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{doc.name}</h4>
                  <p className="text-xs text-gray-400">
                    {doc.file} • {doc.uploadedDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    doc.status === "Verified"
                      ? "bg-green-500/10 text-green-500"
                      : doc.status === "Pending"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {doc.status}
                </span>
                {doc.status === "Pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onVerify(doc.name)}
                      className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onReject(doc.name)}
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button className="p-2 hover:bg-gray-800 rounded-lg transition-all">
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsTab;
