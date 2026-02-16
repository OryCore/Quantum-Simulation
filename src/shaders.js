export const particleVertexShader = `
  attribute vec3 color;
  attribute float alpha;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = color;
    vAlpha = alpha;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Increased scale factor (4.0 -> 8.0) for denser look
    gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
  }
`;

export const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Soft Gaussian
    float glow = exp(-dist * dist * 10.0);
    
    // Higher base opacity (0.15 -> 0.3) for easier visibility
    float opacity = glow * vAlpha * 0.3; 
    
    gl_FragColor = vec4(vColor, opacity);
  }
`;
