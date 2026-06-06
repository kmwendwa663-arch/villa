import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export function Villa3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 10;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffd700, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(-10, 10, 10);
    scene.add(spotLight);

    // Text
    const loader = new FontLoader();
    let textMesh: THREE.Mesh;
    
    // Using a hosted font
    loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      const geometry = new TextGeometry('Meso', {
        font: font,
        size: 2,
        depth: 0.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 5
      });

      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: 0xc5a059, // Gold color
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x221100,
      });

      textMesh = new THREE.Mesh(geometry, material);
      scene.add(textMesh);

      // Add a simple glow/outline effect
      const wireframeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd700, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.1 
      });
      const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
      textMesh.add(wireframe);
    });

    // Particles
    const particlesCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 20;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      if (textMesh) {
        textMesh.rotation.y = Math.sin(Date.now() * 0.001) * 0.2;
        textMesh.position.y = Math.sin(Date.now() * 0.002) * 0.1;
      }

      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Clean up other resources if needed
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[400px] sm:h-[500px]"
      id="villa-3d-canvas"
    />
  );
}
