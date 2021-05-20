import { BEM } from './Helpers/BEM';
import './sketch.scss';

const SketchElem: React.FC<{ className?: string }> = ({ className, children }) => {
  return <div className={seBlock() + ' ' + className || ''}>{children}</div>
}

const { block: seBlock, elem: seElem } = BEM('SketchElem');

export const Sketch: React.FC = () => (
  <div className={block()}>
    <SketchElem className={elem('timeline')}>timeline</SketchElem>
    <SketchElem className={elem('clock')}>clock</SketchElem>
    <SketchElem className={elem('contexts')}>contexts</SketchElem>
    <SketchElem className={elem('buttons')}>buttons</SketchElem>
  </div>
)

const { block, elem } = BEM('App');
