"use strict";

/* jslint browser: true */

import React, {Component} from 'react';
import calculateTextareaHeight from '../utils/calculate-textarea-height';
import {injectStyles, removeStyle} from '../utils/inject-style';
import {omit, extend} from 'underscore';

/**
 * Input component with a great UX like autogrowing & handling states
 *
 * Note on styling: Right now this component doen't allow to change style after
 * initialisation.
 *
 * Note on resizing:
 * If you fill a textarea only with spaces and the cursor reaches the right end
 * it won't break the line. This can leads to unexpected behaviour for the automatic
 * resizing.
 *
 * This component was highly inspired by the great work from these guys
 * - Andrey Popp: https://github.com/andreypopp/react-textarea-autosize
 * - Eugene: https://gist.github.com/eugene1g/5dbaa7d35d0c7d5c2c56
 */
export default class Input extends Component {

  constructor(properties) {
    this.state = {
      height: 'auto',
      textareaProperties: sanitizeChildProperties(properties)
    };
    super(properties);
  }

  render() {
    let style = extend({}, defaultStyle, this.props.style);
    style.height = this.state.height;
    return <textarea style={style}
                     className={ `${this.props.className} ${this.styleId}` }
                     onChange={this.onChange.bind(this)}
                     onKeyDown={this.onKeyDown.bind(this)}
                     {...this.state.textareaProperties}/>;
  }

  /**
   * Generates the style-id & inject the focus & hover style.
   *
   * The style-id is based on React's unique DOM node id.
   */
  componentWillMount() {
    const id = this._reactInternalInstance._rootNodeID.replace(/\./g, '-');
    this.styleId = `style-id${id}`;
    updatePseudoClassStyle(this.styleId, this.props);
  }

  /**
   * Right after the component go injected into the DOM it should be resized.
   */
  componentDidMount() {
    this.resize();
  }

  /**
   * Remove a component's associated syles whenever it gets removed from the DOM.
   */
  componentWillUnmount() {
    removeStyle(this.styleId);
  }

  /**
   * Update the properties passed to the textarea and resize as with the new
   * properties the height might have changed.
   */
  componentWillReceiveProps(properties) {
    this.setState({ textareaProperties: sanitizeChildProperties(properties) });
    updatePseudoClassStyle(this.styleId, this.props);
    this.resize();
  }

  /**
   * Update the height and provide the changeCallback for valueLink.
   *
   * In addition newline characters are replaced by spaces in the textarea value
   * in case allowNewLine is set to false and newLine characters could be found.
   */
  onChange(event) {

    let value = event.target.value;

    if (!this.props.allowNewLine && value.match(newLineRegex) !== null) {
      value = event.target.value.replace(newLineRegex, ' ');

      // controlled textarea must have value
      if (this.state.textareaProperties.value) {
        this.setState({ textareaProperties: { value: value } });
        this.forceUpdate(this.resize);
      // uncontrolled textarea must be updated with value, but then released again
      } else {
        this.setState({ textareaProperties: { value: value } });
        this.forceUpdate(() => {
          this.resize();
          this.setState({ textareaProperties: { value: undefined } });
        });
      }
    }

    this.resize();

    let changeCallback = this.props.onChange;
    const valueLink = this.props.valueLink;

    if (typeof valueLink == 'object' && typeof valueLink.requestChange == 'function') {
      changeCallback = event => valueLink.requestChange(value);
    }

    if (changeCallback) {
      changeCallback(event);
    }
  }

  /**
   * Prevent any newline (except allowNewLine is active) and passes the event to
   * the onKeyDown property.
   *
   * This is an optimization to avoid adding a newline char & removing it right
   * away in the onChange callback.
   */
  onKeyDown(event) {
    if (!this.props.allowNewLine && event.key == 'Enter') {
      event.preventDefault();
    }

    if (this.props.onKeyDown) {
      this.props.onKeyDown(event);
    }
  }

  /**
   * Calculate the height and store the new height in the state to trigger a render.
   */
  resize() {
    let height = calculateTextareaHeight(React.findDOMNode(this));

    if (this.props.minHeight && this.props.minHeight > height) {
      height = this.props.minHeight;
    }

    if (this.props.maxHeight && this.props.maxHeight < height) {
      height = this.props.maxHeight;
    }

    this.setState({ height: height});
  }

  /**
   * Remove focus from this button
   */
  blur() {
    React.findDOMNode(this).blur();
  }

  /**
   * Set focus on this Input component
   */
  focus() {
    React.findDOMNode(this).focus();
  }
}

Input.displayName = 'Belle Input';

Input.propTypes = {
  minHeight: React.PropTypes.number,
  maxHeight: React.PropTypes.number,
  hoverStyle: React.PropTypes.object,
  focusStyle: React.PropTypes.object,
  allowNewLine: React.PropTypes.bool
};

Input.defaultProps = { allowNewLine: false };

const newLineRegex = /[\r\n]/g;

const defaultStyle = {
  /* normalize.css v3.0.1 */
  font: 'inherit',
  margin: 0,

  /* belle input style */
  overflow: 'hidden',
  resize: 'none',
  width: '100%',
  fontSize: 14,
  paddingBottom: 5,
  paddingTop: 7,
  color: '#505050',
  border: '0 #fff solid',
  borderBottom: '1px #ccc solid',
  background: 'none',
  display: 'block',
  boxSizing: 'border-box'
};

const defaultHoverStyle = {
  borderBottom: '1px #92D6EF solid'
};

const defaultFocusStyle = {
  outline: 0, // to avoid default focus behaviour
  borderBottom: '1px #53C7F2 solid'
};

/**
 * Returns an object with properties that are relevant for the Input's textarea.
 *
 * As the height of the textarea needs to be calculated valueLink & onChange can
 * not be passed down to the textarea, but made available through this component.
 */
function sanitizeChildProperties(properties) {
  let childProperties = omit(properties, [
    'valueLink',
    'onChange',
    'onKeyDown',
    'minHeight',
    'maxHeight',
    'className',
    'style',
    'hoverStyle',
    'focusStyle'
  ]);
  if (typeof properties.valueLink == 'object') {
    childProperties.value = properties.valueLink.value;
  }
  return childProperties;
}

/**
 * Update hover & focus style for the speficied styleId.
 *
 * @param styleId {string} - a unique id that exists as class attribute in the DOM
 * @param properties {object} - the components properties optionally containing hoverStyle & focusStyle
 */
function updatePseudoClassStyle(styleId, properties) {
  const hoverStyle = extend({}, defaultHoverStyle, properties.hoverStyle);
  const focusStyle = extend({}, defaultFocusStyle, properties.focusStyle);
  const styles = [
    {
      id: styleId,
      style: hoverStyle,
      pseudoClass: 'hover'
    },
    {
      id: styleId,
      style: focusStyle,
      pseudoClass: 'focus'
    }
  ];
  injectStyles(styles);
}