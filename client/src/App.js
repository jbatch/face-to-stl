import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import StaticStlPreview from "./components/StaticStlPreview";
import MultiColorPhoto from "./components/MultiColorPhoto";

function App() {
  return (
    <Router>
      <div className="App min-h-screen flex flex-col bg-gray-100">
        <header className="bg-blue-600 text-white py-4">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-center">Photo2STL</h1>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 ">
          <Routes>
            <Route path="/" element={<MultiColorPhoto />} />
            <Route path="/static-stl" element={<StaticStlPreview />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
