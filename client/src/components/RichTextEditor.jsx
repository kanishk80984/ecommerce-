import React, { useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Trash2
} from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder = 'Write description here...' }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:border-blue-500 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-gray-50 border-b border-gray-150 p-2 select-none">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Underline"
        >
          <Underline size={15} />
        </button>
        
        <div className="w-px h-5 bg-gray-200 mx-1 align-middle self-center"></div>

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors font-bold text-xs"
          title="Heading 1"
        >
          <Heading1 size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors font-bold text-xs"
          title="Heading 2"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<p>')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors text-xs"
          title="Paragraph"
        >
          P
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1 align-middle self-center"></div>

        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1 align-middle self-center"></div>

        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Align Left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Align Center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
          title="Align Right"
        >
          <AlignRight size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1 align-middle self-center"></div>

        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="p-1.5 rounded hover:bg-gray-200 text-red-600 transition-colors"
          title="Clear Format"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Editor Frame */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[160px] max-h-[400px] overflow-y-auto outline-none prose prose-sm max-w-none text-gray-800 text-sm"
        style={{ minHeight: '160px' }}
        placeholder={placeholder}
      ></div>
    </div>
  );
};

export default RichTextEditor;
