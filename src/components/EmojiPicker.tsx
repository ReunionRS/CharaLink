import React, { useState, useEffect, useRef } from 'react';
import './EmojiPicker.css';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  '😀': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  '😢': ['😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵'],
  '👋': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('😀');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();

  return (
    <div className="emoji-picker" ref={pickerRef}>
      <div className="emoji-picker__header">
        <div className="emoji-picker__categories">
          {Object.keys(EMOJI_CATEGORIES).map((emoji) => (
            <button
              key={emoji}
              className={`emoji-picker__category ${activeCategory === emoji ? 'active' : ''}`}
              onClick={() => setActiveCategory(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button className="emoji-picker__close" onClick={onClose}>×</button>
      </div>
      <div className="emoji-picker__content">
        {allEmojis.map((emoji, index) => (
          <button
            key={index}
            className="emoji-picker__emoji"
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;

