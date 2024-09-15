import React from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import ImageToStl from "./components/ImageToStl";
import StaticStlPreview from "./components/StaticStlPreview";
import MultiColorPhoto from "./components/MultiColorPhoto";

function App() {
  return (
    <Router>
      <div className="App min-h-screen flex flex-col bg-gray-100">
        <header className="bg-blue-600 text-white py-4">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-center">Face-to-STL</h1>
            <nav className="mt-4">
              <ul className="flex justify-center space-x-4">
                <li>
                  <Link to="/" className="hover:underline">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/static-stl" className="hover:underline">
                    Static STL Preview
                  </Link>
                </li>
                <li>
                  <Link to="/multi-color" className="hover:underline">
                    Multi Color Photo
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ImageToStl />} />
            <Route path="/static-stl" element={<StaticStlPreview />} />
            <Route path="/multi-color" element={<MultiColorPhoto />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
