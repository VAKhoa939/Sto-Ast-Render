import React, { useState } from "react";
import {
  faFile,
  faFileAlt,
  faSearch,
  faTrash,
  faEdit,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Modal, Button, Form } from "react-bootstrap";
//import { ref, remove, update } from "../../../src/firebase";
//import { getDatabase } from "firebase/database";
import { useAuth } from "../../contexts/AuthContext";
import { FileClass } from "../classes/FileClass";
/* //old version delete
const handleDeleteFirebase = async (fileId, currentUser) => {
  const db = getDatabase();
  const fileRef = ref(db, `files/${currentUser.uid}/${fileId}`);

  try {
    await remove(fileRef);
    alert("File deleted successfully.");
  } catch (error) {
    console.error("Error deleting file from Firebase:", error);
    alert("Error deleting file.");
  }
};
*/
/* //old version add
const handleUpdateFirebase = async (fileId, updatedName, updatedContent, currentUser) => {
  const db = getDatabase();
  const fileRef = ref(db, `files/${currentUser.uid}/${fileId}`);

  try {
    await update(fileRef, {
      name: updatedName.trim(),
      content: btoa(updatedContent),
    });
    alert("File updated successfully.");
  } catch (error) {
    console.error("Error updating file in Firebase:", error);
    alert("Error updating file.");
  }
};
*/
export default function File({ file, onChange }) {
  const { currentUser, getIdToken } = useAuth();
  const fileObj = new FileClass({ ...file, user: currentUser });

  const [showModal, setShowModal] = useState(false);
  const [fileContent, setFileContent] = useState(fileObj.decodeContent());
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedFileName, setUpdatedFileName] = useState(fileObj.name);

  const handleFileClick = () => {
    setFileContent(fileObj.isText ? fileObj.decodeContent() : fileObj.content);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      const token = await getIdToken();
      if (!token) {
        alert("User not authenticated");
        return;
      }
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/files/${fileObj.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filePath: fileObj.path,
            }),
          }
        );
        if (response.ok) {
          alert("File deleted successfully.");
          setShowModal(false);
          onChange();
        } else {
          alert("Error deleting file.");
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        alert("Error deleting file.");
      }
    }
  };

  const handleUpdate = () => setIsEditing(true);

  const handleSaveUpdate = async () => {
    if (!updatedFileName.trim()) return alert("File name cannot be empty.");
    if (!fileContent.trim()) return alert("File content cannot be empty.");

    const token = await getIdToken();
    if (!token) {
      alert("User not authenticated");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/files/${fileObj.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: updatedFileName.trim(),
            content: btoa(fileContent),
            filePath: fileObj.path,
          }),
        }
      );

      if (response.ok) {
        console.log("File updated successfully.");
        setIsEditing(false);
        //onChange();
      } else {
        alert("Error updating file.");
      }
    } catch (error) {
      console.error("Error updating file:", error);
      alert("Error updating file.");
    }
  };

  const fetchAIResponse = async (task, isImage = false) => {
    const token = await getIdToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    let result = "Processing...";
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/ai`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: isImage ? fileObj.content : fileObj.decodeContent(),
            task,
            isImage,
            mimeType: fileObj.mimeType,
          }),
        }
      );
      const data = await response.json();
      result = data.result || "No result returned.";
    } catch (error) {
      console.error("Error fetching AI response:", error);
      result = "Error processing content with AI.";
    }
    setAiResponse(result);
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setUpdatedFileName("");
    setFileContent("");
    setAiResponse("");
    setIsEditing(false);
  };

  return (
    <>
      <Button
        onClick={handleFileClick}
        variant="outline-dark"
        className="text-truncate w-100"
        style={{ cursor: "pointer" }}
      >
        <FontAwesomeIcon icon={faFile} className="me-2" />
        <span
          dangerouslySetInnerHTML={{
            __html:
              file.highlightedName && typeof file.highlightedName === "string"
                ? file.highlightedName
                : file.name,
          }}
        />
      </Button>

      <Modal show={showModal} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditing ? (
              <Form.Control
                type="text"
                value={updatedFileName}
                onChange={(e) => setUpdatedFileName(e.target.value)}
                autoFocus
              />
            ) : (
              `File: ${fileObj.name}`
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {fileObj.isImage ? (
                <>
                  <img
                    src={`data:${fileObj.mimeType};base64,${fileObj.content}`}
                    alt="file"
                    style={{ maxWidth: "100%", maxHeight: "400px" }}
                  />
                  <div className="mt-3 d-flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => fetchAIResponse("describe", true)}
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Describe Image
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => fetchAIResponse("objects", true)}
                    >
                      <FontAwesomeIcon icon={faSearch} className="me-2" />
                      Identify Objects
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                      <FontAwesomeIcon icon={faTrash} className="me-2" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : fileObj.isText ? (
                <>
                  <pre>{fileContent}</pre>
                  <textarea
                    className="form-control"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    rows="10"
                    disabled={!isEditing}
                  />
                  <div className="mt-3 d-flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => fetchAIResponse("summarize")}
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Summarize
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => fetchAIResponse("keywords")}
                    >
                      <FontAwesomeIcon icon={faSearch} className="me-2" />
                      Find Keywords
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                      <FontAwesomeIcon icon={faTrash} className="me-2" />
                      Delete
                    </Button>
                    {isEditing ? (
                      <Button variant="success" onClick={handleSaveUpdate}>
                        <FontAwesomeIcon icon={faSave} className="me-2" />
                        Save Changes
                      </Button>
                    ) : (
                      <Button variant="warning" onClick={handleUpdate}>
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p>{fileContent}</p>
                  <Button variant="danger" onClick={handleDelete}>
                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                    Delete
                  </Button>
                </>
              )}
              {aiResponse && (
                <div className="mt-3">
                  <h5>AI Response:</h5>
                  <p>{aiResponse}</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
