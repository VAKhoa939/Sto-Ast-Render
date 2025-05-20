import React, { useState } from "react";
import { Container, Form } from "react-bootstrap";
import { useFolder } from "../../hooks/useFolder";
import CreateFolderButton from "./CreateFolderButton";
import Folder from "./Folder";
import Navbar from "./Navbar";
import { useParams } from "react-router-dom";
import FolderBreadcrumbs from "./FolderBreadcrumbs";
import AddFileButton from "./AddFileButton";
import File from "./File";
import Chatbot from "./ChatBot";
import { FolderClass } from "../classes/FolderClass";

export default function Dashboard() {
  const { folderId } = useParams();
  const { folder, childFolders, childFiles } = useFolder(folderId);

  const [showChatbot, setShowChatbot] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ make it string!

  const toggleChatbot = () => setShowChatbot((prev) => !prev);

  // Highlight matched text
  const highlightText = (text, query) => {
    if (!query || typeof text !== "string") return text;
    const cleanQuery = query.replace(/(#\w+|type:\w+)/g, "").trim();
    if (!cleanQuery) return text;
    const regex = new RegExp(`(${cleanQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const normalize = (str) =>
    typeof str === "string" ? str.toLowerCase().trim() : "";

  // Check for tag search (#tag)
  const isTagMatch = (item) => {
    const match = searchQuery.match(/#(\w+)/);
    if (!match) return true;
    const tags = normalize(item.tags || "");
    return tags.includes(match[1]);
  };

  // Check for type search (type:pdf, type:docx)
  const isTypeMatch = (file) => {
    const match = searchQuery.match(/type:(\w+)/);
    if (!match) return true;
    const ext = match[1];
    return file.name && file.name.toLowerCase().endsWith("." + ext);
  };

  // Name matching (normal text search)
  const isNameMatch = (name) => {
    const cleanQuery = searchQuery.replace(/#\w+|type:\w+/g, "").trim();
    if (!cleanQuery) return true;
    return normalize(name).includes(normalize(cleanQuery));
  };

  return (
    <>
      <Navbar />
      <Container fluid>
        <div className="d-flex align-items-center justify-content-between flex-wrap">
          <div className="d-flex align-items-center flex-grow-1">
            <FolderBreadcrumbs currentFolder={folder} />
            <CreateFolderButton currentFolder={folder} />
            <AddFileButton currentFolder={folder} />
            <Form.Control
              type="text"
              placeholder="🔍 Search files or folders... (#tag, type:pdf)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 300, marginTop: 8 }}
            />
          </div>
        </div>

        {/* Folder List */}
        {Array.isArray(childFolders) && (
          <div className="d-flex flex-wrap mt-3">
            {childFolders
              .filter((f) => isNameMatch(f.name) && isTagMatch(f))
              .map((child) => {
                const folderInstance = FolderClass.fromObject(child); // convert to Folder instance
                folderInstance.highlightedName = highlightText(
                  child.name,
                  searchQuery
                ); // attach highlighted name
                return (
                  <div
                    key={child.id}
                    style={{ maxWidth: "200px" }}
                    className="p-2"
                  >
                    <Folder folder={folderInstance} />
                  </div>
                );
              })}
          </div>
        )}

        {/* File List */}
        {Array.isArray(childFiles) && (
          <div className="d-flex flex-wrap mt-3">
            {childFiles
              .filter(
                (file) =>
                  file.folderId === folderId &&
                  isNameMatch(file.name) &&
                  isTypeMatch(file) &&
                  isTagMatch(file)
              )
              .map((child) => (
                <div
                  key={child.id}
                  style={{ maxWidth: "200px" }}
                  className="p-2"
                >
                  <File
                    file={{
                      ...child,
                      highlightedName: highlightText(child.name, searchQuery),
                    }}
                  />
                </div>
              ))}
          </div>
        )}

        {/* Chatbot Button */}
        <button
          onClick={toggleChatbot}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "12px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "50%",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          {showChatbot ? "✖" : "💬"}
        </button>

        {/* Chatbot Container */}
        {showChatbot && (
          <div
            style={{
              position: "fixed",
              bottom: "80px",
              right: "20px",
              width: "300px",
              height: "400px",
              zIndex: 999,
            }}
          >
            <Chatbot />
          </div>
        )}
      </Container>
    </>
  );
}
