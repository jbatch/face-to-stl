import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const StlViewer = ({ stlFile, colorPalette }) => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mountRef.current || !stlFile) return;

    let scene, camera, renderer, controls, mesh;

    try {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      // Camera setup
      const aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
      mountRef.current.appendChild(renderer.domElement);

      // Controls setup
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.screenSpacePanning = false;

      // Lighting setup
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Add AxesHelper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // STL loading
      const loader = new STLLoader();
      loader.load(
        stlFile,
        (geometry) => {
          // Ensure bounding box and bounding sphere are computed
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          // Ensure normals are computed correctly
          geometry.computeVertexNormals();

          // Apply transformations
          const matrix = new THREE.Matrix4();
          matrix.makeRotationZ(-Math.PI); // Rotate 180 degrees around Z-axis
          geometry.applyMatrix4(matrix);

          matrix.makeRotationX(-Math.PI / 2); // Rotate 90 degrees around X-axis
          geometry.applyMatrix4(matrix);

          const objectWidth =
            geometry.boundingBox.max.x - geometry.boundingBox.min.x;
          matrix.makeTranslation(objectWidth, 0, 0);
          geometry.applyMatrix4(matrix);

          // Update bounding box and sphere after transformations
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          // Custom shader material
          const colors = colorPalette.reduce(
            (acc, cur, i) => ({
              ...acc,
              [`color${i + 1}`]: { value: new THREE.Color(parseInt(cur, 16)) },
            }),
            {}
          );
          // TODO (make work with N colors)
          const layerColorFunc = `mix(color1, color2, step(5.01 , t));`;
          const customMaterial = new THREE.ShaderMaterial({
            uniforms: {
              ...colors,
              minY: { value: geometry.boundingBox.min.y },
              maxY: { value: geometry.boundingBox.max.y },
            },
            vertexShader: `
              varying vec3 vPosition;
              varying vec3 vNormal;
              void main() {
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color1;
              uniform vec3 color2;
              uniform float minY;
              uniform float maxY;
              varying vec3 vPosition;
              varying vec3 vNormal;
              void main() {
                float t = vPosition.y;
                vec3 color = ${layerColorFunc};
                
                // Basic lighting calculation
                vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                float dProd = max(0.0, dot(vNormal, light));
                
                gl_FragColor = vec4(color * (0.5 + 0.5 * dProd), 1.0);
              }
            `,
            side: THREE.DoubleSide, // Render both sides of each face
          });

          mesh = new THREE.Mesh(geometry, customMaterial);
          scene.add(mesh);

          // Use bounding sphere for camera positioning
          const { radius, center } = geometry.boundingSphere;

          // Position camera to fit the object
          const distanceToFit = radius * 3;
          camera.position.set(distanceToFit, distanceToFit, distanceToFit);
          camera.lookAt(center);

          // Set controls target to center of the model
          controls.target.copy(center);

          // Set camera near and far planes based on model size
          camera.near = radius / 100;
          camera.far = radius * 100;
          camera.updateProjectionMatrix();

          controls.maxDistance = distanceToFit * 10;
          controls.minDistance = distanceToFit * 0.5;

          // Scale AxesHelper based on model size
          axesHelper.scale.setScalar(radius);

          controls.update();
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error("Error loading STL:", error);
          setError(`Failed to load STL file: ${error.message}`);
        }
      );

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        if (mountRef.current) {
          const width = mountRef.current.clientWidth;
          const height = mountRef.current.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      };
      window.addEventListener("resize", handleResize);

      // Store the current value of mountRef in a variable
      const currentMount = mountRef.current;

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (currentMount) {
          currentMount.removeChild(renderer.domElement);
        }
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
        if (renderer) {
          renderer.dispose();
        }
      };
    } catch (err) {
      console.error("Error in STL viewer:", err);
      setError(`Failed to load STL file: ${err.message}`);
    }
  }, [colorPalette, stlFile]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div ref={mountRef} style={{ width: "100%", height: "400px" }} />;
};

export default StlViewer;