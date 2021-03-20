import { BEM } from './BEM';
import './Effect1.scss';

export const Effect1: React.FC<{ State: 1 | 2, className?: string }> = ({ State, className }) => {
  return (
    <div className={`${block(`State${State}`)} ${className || ''}`}>
      <div className={elem('A')}></div>
      <div className={elem('B')}></div>
    </div>
  );
}

const { block, elem } = BEM('Effect1');
