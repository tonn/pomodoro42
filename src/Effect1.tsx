import { BEM } from './BEM';
import './Effect1.scss';

export const Effect1: React.FC<{ State: 'focusing' | 'stopped' | 'resting' , className?: string }> = ({ State, className }) => {
  return (
    <div className={`${block(State)} ${className || ''}`}>
      <div className={elem('Focusing')}></div>
      <div className={elem('Resting')}></div>
    </div>
  );
}

const { block, elem } = BEM('Effect1');
