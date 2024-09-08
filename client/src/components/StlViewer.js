import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const StlViewer = ({ stlFile }) => {
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
      const arrayBuffer = base64ToArrayBuffer(stlFile);
      const geometry = loader.parse(arrayBuffer);

      // Rotate the geometry
      const rotationMatrix = new THREE.Matrix4()
        .makeRotationX(Math.PI / 2)
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      geometry.applyMatrix4(rotationMatrix);

      // Center the geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      // Ensure normals are computed correctly
      geometry.computeVertexNormals();

      // Custom shader material
      const customMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color1: { value: new THREE.Color(0x000000) }, // Black
          color2: { value: new THREE.Color(0xff0000) }, // Red
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
            float t = (vPosition.y - minY) / (maxY - minY);
            vec3 color = mix(color1, color2, step(5.0/7.0 + 0.1, t));
            
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

      // Compute bounding sphere
      geometry.computeBoundingSphere();

      if (geometry.boundingSphere) {
        const { radius } = geometry.boundingSphere;

        // Position camera for top-down view
        const distanceToFit = radius * 2.5;
        camera.position.set(0, distanceToFit, 0);
        camera.lookAt(0, 0, 0);

        // Set controls target to center of the model
        controls.target.set(0, 0, 0);

        // Set camera near and far planes based on model size
        camera.near = radius / 100;
        camera.far = radius * 100;
        camera.updateProjectionMatrix();

        controls.maxDistance = distanceToFit * 10;
        controls.minDistance = distanceToFit * 0.5;

        // Scale AxesHelper based on model size
        axesHelper.scale.setScalar(radius);
      }

      controls.update();

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

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
        if (mesh) {
          scene.remove(mesh);
          geometry.dispose();
          customMaterial.dispose();
        }
        if (renderer) {
          renderer.dispose();
        }
      };
    } catch (err) {
      console.error("Error in STL viewer:", err);
      setError(`Failed to load STL file: ${err.message}`);
    }
  }, [stlFile]);

  // Helper function to convert base64 to ArrayBuffer
  function base64ToArrayBuffer(base64) {
    try {
      const binary_string = window.atob(base64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (err) {
      throw new Error(`Invalid base64 string: ${err.message}`);
    }
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div ref={mountRef} style={{ width: "100%", height: "400px" }} />;
};

export default StlViewer;
