import "../legal/legal.css";

export const metadata = {
  title: 'Size Guide',
};

export default function SizeGuidePage() {
  return (
    <div className="legal-container">
      <main className="legal-content">
        <h1 className="legal-title">Size Guide</h1>
        
        <div className="legal-prose">
          <p>Use the charts below to determine your correct size for NUSC Official Kits and Training Wear. Measurements are in centimeters (cm) unless otherwise specified.</p>

          <h2>Men's Tops (Kits & Jackets)</h2>
          <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line-l)' }}>
                  <th style={{ padding: '12px 8px' }}>Size</th>
                  <th style={{ padding: '12px 8px' }}>Chest (cm)</th>
                  <th style={{ padding: '12px 8px' }}>Waist (cm)</th>
                  <th style={{ padding: '12px 8px' }}>Hips (cm)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--line-l)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>S</td>
                  <td style={{ padding: '12px 8px' }}>88 - 96</td>
                  <td style={{ padding: '12px 8px' }}>73 - 81</td>
                  <td style={{ padding: '12px 8px' }}>88 - 96</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line-l)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>M</td>
                  <td style={{ padding: '12px 8px' }}>96 - 104</td>
                  <td style={{ padding: '12px 8px' }}>81 - 89</td>
                  <td style={{ padding: '12px 8px' }}>96 - 104</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line-l)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>L</td>
                  <td style={{ padding: '12px 8px' }}>104 - 112</td>
                  <td style={{ padding: '12px 8px' }}>89 - 97</td>
                  <td style={{ padding: '12px 8px' }}>104 - 112</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line-l)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>XL</td>
                  <td style={{ padding: '12px 8px' }}>112 - 124</td>
                  <td style={{ padding: '12px 8px' }}>97 - 109</td>
                  <td style={{ padding: '12px 8px' }}>112 - 120</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>XXL</td>
                  <td style={{ padding: '12px 8px' }}>124 - 136</td>
                  <td style={{ padding: '12px 8px' }}>109 - 121</td>
                  <td style={{ padding: '12px 8px' }}>120 - 128</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>How to Measure</h2>
          <ul>
            <li><strong>Chest:</strong> Measure around the fullest part of your chest, keeping the measuring tape horizontal.</li>
            <li><strong>Waist:</strong> Measure around the narrowest part (typically where your body bends side to side), keeping the tape horizontal.</li>
            <li><strong>Hips:</strong> Measure around the fullest part of your hips, keeping the tape horizontal.</li>
          </ul>

          <p><em>If you are on the borderline between two sizes, order the smaller size for a tighter fit or the larger size for a looser fit. If your measurements for chest and waist correspond to two different suggested sizes, order the size indicated by your chest measurement.</em></p>
        </div>
      </main>
    </div>
  );
}
