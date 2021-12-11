//https://raw.githubusercontent.com/rintoj/react-virtualscroll/master/src/virtual-scroll.tsx

import * as React from 'react';

export interface ChangeEvent {
  start?: number;
  end?: number;
}

export interface Props<TItem> {
  items: TItem[];
  className?: string;
  scrollbarWidth?: number;
  scrollbarHeight?: number;
  childWidth?: number;
  childHeight?: number;
  onUpdate?(items: any[]): any;
  onChange?(event: ChangeEvent): any;
  onStart?(event: ChangeEvent): any;
  onEnd?(event: ChangeEvent): any;
  renderItem(item: TItem, index: number, items: TItem[]): React.ReactNode;
}

export interface State {
  topPadding?: number;
  scrollHeight: number;
  items?: any;
}

const style: any = {
  host: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    overflowY: 'overlay',
    position: 'relative',
    WebkitOverflowScrolling: 'touch'
  },
  content: {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    position: 'absolute'
  }
};

export class VirtualScroll<TItem> extends React.Component<Props<TItem>, State> {
  previousStart?: number;
  previousEnd?: number;
  startupLoop: boolean = true;

  private el?: HTMLElement;
  private content?: HTMLElement;
  private onScrollListener?: any;

  constructor(props: any) {
    super(props);
    this.state = { scrollHeight: 0 };
  }

  componentDidMount() {
    this.onScrollListener = this.el?.addEventListener('scroll', this.refresh.bind(this));
    this.refresh();
  }

  componentWillReceiveProps(props: Props<TItem>) {
    if (props.items !== this.props.items) {
      this.previousStart = undefined;
      this.previousEnd = undefined;
    }
    this.refresh();
  }

  componentWillUnmount() {
    if (this.onScrollListener !== undefined) {
      this.onScrollListener();
    }
  }

  render() {
    const items = (this.state.items || []).map(this.props.renderItem);

    return <div ref={el => this.el = (el || undefined)} style={style.host}>
      <div className={`total-padding`} style={{ opacity: 0, width: 0, height: `${this.state.scrollHeight}px` }} />
      <div ref={el => this.content = (el || undefined)} className={this.props.className}
        style={Object.assign({}, style.content, { transform: `translateY(${this.state.topPadding}px)` })}>
        {items}
      </div>
    </div>;
  }

  refresh() {
    requestAnimationFrame(() => this.calculateItems());
  }

  scrollInto(item: any) {
    let index: number = (this.props.items || []).indexOf(item);
    if (index < 0 || index >= (this.props.items || []).length) {
      return;
    }

    const d = this.calculateDimensions();

    if (this.el && d) {
      this.el.scrollTop = Math.floor(index / d.itemsPerRow) * d.childHeight - Math.max(0, (d.itemsPerCol - 1)) * d.childHeight;
    }

    this.refresh();
  }

  private countItemsPerRow() {
    let offsetTop
    let itemsPerRow
    let children = this.content?.children;

    if (children) {
      for (itemsPerRow = 0; itemsPerRow < children.length; itemsPerRow++) {
        if (offsetTop !== undefined && offsetTop !== (children[itemsPerRow] as any).offsetTop) {
          break;
        }

        offsetTop = (children[itemsPerRow] as any).offsetTop;
      }

      return itemsPerRow;
    }
  }

  private calculateDimensions() {
    if(!this.el || !this.content) {
      return;
    }

    let items = this.props.items || [];
    let itemCount = items.length;
    let viewWidth = this.el.clientWidth - (this.props.scrollbarWidth || 0);
    let viewHeight = this.el.clientHeight - (this.props.scrollbarHeight || 0)

    if (this.props.childWidth === undefined || this.props.childHeight === undefined) {
      const contentDimensions = this.content.children[0] ?
        this.content.children[0].getBoundingClientRect() :
        { width: viewWidth, height: viewHeight };

      let childWidth = this.props.childWidth || contentDimensions.width
      let childHeight = this.props.childHeight || contentDimensions.height

      let itemsPerRow = Math.max(1, this.countItemsPerRow() || 0)
      let itemsPerRowByCalc = Math.max(1, Math.floor(viewWidth / childWidth))
      let itemsPerCol = Math.max(1, Math.floor(viewHeight / childHeight))
      let scrollTop = Math.max(0, this.el.scrollTop)

      if (itemsPerCol === 1 && Math.floor(scrollTop / this.state.scrollHeight * itemCount) + itemsPerRowByCalc >= itemCount) {
        itemsPerRow = itemsPerRowByCalc;
      }

      return {
        itemCount: itemCount,
        viewWidth: viewWidth,
        viewHeight: viewHeight,
        childWidth: childWidth,
        childHeight: childHeight,
        itemsPerRow: itemsPerRow,
        itemsPerCol: itemsPerCol,
        itemsPerRowByCalc: itemsPerRowByCalc
      };
    }
  }

  private calculateItems() {
    let d = this.calculateDimensions();

    if (!d || !this.el) {
      return;
    }

    let items = this.props.items || [];
    const scrollHeight = d.childHeight * d.itemCount / d.itemsPerRow;
    if (this.el.scrollTop > scrollHeight) {
      this.el.scrollTop = scrollHeight;
    }

    let scrollTop = Math.max(0, this.el.scrollTop);
    let indexByScrollTop = scrollTop / scrollHeight * d.itemCount / d.itemsPerRow;
    let end = Math.min(d.itemCount, Math.ceil(indexByScrollTop) * d.itemsPerRow + d.itemsPerRow * (d.itemsPerCol + 1));

    let maxStartEnd = end;
    const modEnd = end % d.itemsPerRow;
    if (modEnd) {
      maxStartEnd = end + d.itemsPerRow - modEnd;
    }
    let maxStart = Math.max(0, maxStartEnd - d.itemsPerCol * d.itemsPerRow - d.itemsPerRow);
    let start = Math.min(maxStart, Math.floor(indexByScrollTop) * d.itemsPerRow);

    const topPadding = d.childHeight * Math.ceil(start / d.itemsPerRow);
    this.setState({ topPadding, scrollHeight });

    start = !isNaN(start) ? start : 0;
    end = !isNaN(end) ? end : 0;
    if (start !== this.previousStart || end !== this.previousEnd) {
      // update the scroll list
      if (typeof this.props.renderItem === 'function') {
        const scrollItems = items.slice(start, end);
        this.setState({ items: scrollItems });
        if (typeof this.props.onUpdate === 'function') {
          this.props.onUpdate(scrollItems);
        }
      }

      // emit 'start' event
      if (typeof this.props.onStart === 'function') {
        if (start !== this.previousStart && this.startupLoop === false) {
          this.props.onStart({ start, end });
        }
      }

      // emit 'end' event
      if (typeof this.props.onEnd === 'function') {
        if (end !== this.previousEnd && this.startupLoop === false) {
          this.props.onEnd({ start, end });
        }
      }

      this.previousStart = start;
      this.previousEnd = end;

      if (this.startupLoop === true) {
        this.refresh();
      } else {
        if (typeof this.props.onChange === 'function') {
          this.props.onChange({ start, end });
        }
      }
    } else if (this.startupLoop === true) {
      this.startupLoop = false;
      if (typeof this.props.onChange === 'function') {
        this.props.onChange({ start, end });
      }
      this.refresh();
    }
  }
}
