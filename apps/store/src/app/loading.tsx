import Image from "next/image";

export default function Loading() {
  return (
    <div className="store-loader-container">
      <div className="store-loader-content">
        <div className="store-loader-ball">
          <Image 
            src="/loader/ball.png" 
            alt="Loading..." 
            width={80} 
            height={80} 
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className="store-loader-text">
          LOADING<span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  );
}
