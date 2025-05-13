import React, { useState } from "react";
import { Button, Modal, Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { FolderClass } from "../classes/FolderClass"; // import renamed to avoid naming conflict

export default function Folder({ folder, onRename, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [clickedFolder, setClickedFolder] = useState(null);

  // Open modal on right-click
  const handleRightClick = (e) => {
    e.preventDefault();
    setClickedFolder(folder); // Store the folder clicked
    setShowModal(true); // Show the modal
  };

  const handleCloseModal = () => setShowModal(false);

  const handleRename = () => {
    if (onRename && clickedFolder) {
      onRename(clickedFolder);
    }
    handleCloseModal();
  };

  const handleDelete = () => {
    if (onDelete && clickedFolder) {
      onDelete(clickedFolder);
    }
    handleCloseModal();
  };

  if (!folder || !(folder instanceof FolderClass)) return null;

  return (
    <>
      <Button
        as={Link}
        to={`/folder/${folder.id}`} // ✅ Removed circular structure from state
        variant="outline-dark"
        className="text-truncate w-100"
        onContextMenu={handleRightClick} // Add right-click handler
      >
        <FontAwesomeIcon icon={faFolder} style={{ marginRight: 6 }} />
        <span
          dangerouslySetInnerHTML={{
            __html: folder.highlightedName || folder.name || "Unnamed Folder",
          }}
        />
      </Button>

      {/* Right-click Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Folder Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Dropdown.Divider />
          <Button variant="secondary" onClick={handleRename}>Rename</Button>
          <Button variant="danger" onClick={handleDelete} className="ml-2">Delete</Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
