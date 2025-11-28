import { useParams, Navigate } from 'react-router-dom';
import { useData } from './context/data';
import type { Block, DiaryBlockType, ImageBlockType, TextBlockType } from './types';
import TextInfo from './components/Info/TextInfo';
import ImageInfo from './components/Info/ImageInfo';
import DiaryInfo from './components/Info/DiaryInfo';
function renderBlock(node: Block) {
  switch (node.type) {
    case "text":
      return <TextInfo node={node as TextBlockType} />;

    case "image":
      return <ImageInfo node={node as ImageBlockType} />;

    case "diary_entry":
      return <DiaryInfo node={node as DiaryBlockType} />;

    default:
      return null;
  }
}

export default function BlockInfo() {
  let { id } = useParams();
  const { dataMap } = useData();

  if (!id) return <Navigate to="/" replace />;
  id = String(id).trim();
  if (!dataMap || Object.keys(dataMap).length === 0) {
    return <p>Loading...</p>; // or a spinner
  }

  const node = dataMap[id];

  // If the id doesn’t exist in the dataMap
  if (!node) return <Navigate to="/" replace />;

  const isDiary = node.type === "diary_entry";

  return (
    <>
      {/* Diary entries have their own layout */}
      {isDiary ? (
        renderBlock(node)
      ) : (
        <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
          <div
            className="
              h-full w-auto min-w-0 
              mt-[150px] ml-[20px] mr-[50px] pb-[30vh] 
              transition-transform duration-200 ease-linear
              translate-x-[calc(var(--direction,1)_*_0px)]
            "
          >
            {renderBlock(node)}
          </div>
        </div>
      )}
    </>
  );
}
