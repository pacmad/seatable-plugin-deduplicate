import React, { Fragment } from 'react';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import TableView from './table-view';
import intl from 'react-intl-universal';
import moment from 'moment';
import { SingleSelectFormatter } from 'dtable-ui-component';
import { getImageThumbnailUrl } from '../utils';
import styles from '../css/plugin-layout.module.css';
import CollaboratorFormatter from '../components/formatter/collaborator-formatter';
import RecordItem from './record';

import fileIcon from '../image/file.png';

const UNSHOWN_COLUMN_KEY_LIST = ['0000'];
const UNSHOWN_COLUMN_TYPE_LIST = ['long-text', 'geolocation', 'link'];

class DetailDuplicationDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog: false
    };
    this.recordItems = []; 
    this.scrollLeft = 0;
  }

  componentWillUnmount() {
    this.recordItems = null;
  }

  toggle = () => {
    this.setState({
      showDialog: !this.state.showDialog
    });
  }

  showDetailData = (e, selectedItem) => {
    this.props.setDetailData(selectedItem);
  }

  onRowDelete = (rowId) => {
    this.props.onRowDelete(rowId);
  }

  handleVerticalScroll = (e) => {
    // to keep the value of `this.scrollLeft`
    e.stopPropagation(); // important!
  }

  onRef = (ref, rowIdx) => {
    this.recordItems[rowIdx] = ref;
  }

  renderDetailData = () => {
    const { dtable, configSettings, selectedItem } = this.props;
    const table = dtable.getTableByName(configSettings[0].active);
    return (
      <Fragment>
      <ol className={styles["column-name-list"]}>
      {table.columns.map((item, index) => {
        if (!UNSHOWN_COLUMN_KEY_LIST.includes(item.key) &&
          !UNSHOWN_COLUMN_TYPE_LIST.includes(item.type)) {
          return <li key={`column-name-${index}`}
          className={`${styles['column-name']} text-truncate`}
          style={{'width': this.getCellRecordWidth(item)}}
          title={item.name}
            >{item.name}</li>;
        }
        return null;
      })}
      </ol>
      <div className={styles["record-list"]} onScroll={this.handleVerticalScroll}>
      {selectedItem.rows.length > 0 && selectedItem.rows.map((row, index, rows) => {
        return (
          <RecordItem
            key={'deduplication-record-' + index}
            rowName={this.getRowName(row, table, index)}
            row={row}
            onRowDelete={() => this.onRowDelete(row)}
            values={this.getRecord(row, table)}
            onRef={this.onRef}
            rowIdx={index}
          />
        );
      })}
      </div>
      </Fragment>
    );
  }

  getRowName = (rowId, table, index) => {
    const row = table['id_row_map'][rowId];
    let rowName = row['0000'] || '';
    return rowName;
  }

  getRecord = (rowIdx, table) => {
    let { columns } = table;
    const row = table['id_row_map'][rowIdx];
    return this.getRowRecord(row, columns, UNSHOWN_COLUMN_KEY_LIST);
  }

  getRowRecord = (row, columns, unshownColumnKeyList) => {
    let displayRow = [];
    columns.forEach((column) => {
      displayRow.push(
        this.getFormattedCell(column, row, unshownColumnKeyList)
      );
    });
    return displayRow;
  };

  getFormattedCell = (column, row, unshownColumnKeyList) => {
    let { key, name, type, data } = column;
    let { _id: rowId } = row;
    let value = row[key];
    let displayValue;
    let isNonEmptyArray = Array.isArray(value) && value.length > 0;
    if (!unshownColumnKeyList.includes(key) && !UNSHOWN_COLUMN_TYPE_LIST.includes(type)) {
      switch(type) {
        case 'text': { 
          if (value && typeof value === 'string') {
            displayValue = <span className={styles["cell-value-ellipsis"]}>{value}</span>;
          }
          break;
        }
        case 'date': {
          if (value && typeof value === 'string') {
            let format = 'YYYY-MM-DD';
            displayValue = moment(value).format(format);
          }
          break;
        }
        case 'ctime': 
        case 'mtime': {
          if (value && typeof value === 'string') {
            displayValue = moment(value).format('YYYY-MM-DD HH:mm:ss');
          }
          break;
        }
        case 'number': {
          if (Object.prototype.toString.call(value) === '[object Number]') {
            displayValue = <div className={styles["number-formatter"]}>
              {value}
            </div>;
          }
          break;
        }
        
        case 'collaborator': {
          if (value && isNonEmptyArray) {
            let { collaborators } = this.props;
            let validValue = value.filter(item => {
              return collaborators.find(collaborator => collaborator.email === item);
            });
            displayValue = validValue.length > 0 ? <CollaboratorFormatter collaborators={collaborators} value={validValue} /> : '';
          }
          break;
        }
        case 'single-select': {
          if (value && typeof value === 'string') {
            let options = data && data.options ? data.options : [];
            let option = options.find(option => option.id === value);
            displayValue = option ? <SingleSelectFormatter options={options} value={value} /> : '';
          }
          break;
        }

        case 'multiple-select': {
          if (value && isNonEmptyArray) {
            let options = data && data.options ? data.options : []; 
            let validValue = value.filter((item) => {
              return options.find(option => option.id === item);
            }); 
            displayValue = validValue.length > 0 ? 
              <div className="multiple-select-formatter d-flex">
                {validValue.map((item, index) => {
                  return <SingleSelectFormatter options={options} value={item} key={`row-operation-multiple-select-${index}`} />;
                })} 
              </div> 
              : ''; 
          }   
          break;
        }

        case 'file': {
          if (value && isNonEmptyArray) {
            let amount = value.length;
            displayValue = <div className="image-cell-value">
              <img alt='' src={fileIcon} width="24" />
              {amount > 1 && <span className="cell-value-size">{`+${amount - 1}`}</span>}
              </div>;
          }
          break;
        }

        case 'image': {
          if (value && isNonEmptyArray) {
            let imgSrc = getImageThumbnailUrl(value[0]);
            let amount = value.length;
            displayValue = <div className="image-cell-value h-100">
              <img alt='' src={imgSrc} className="mh-100" />
              {amount > 1 && <span className="cell-value-size">{`+${amount - 1}`}</span>}
              </div>;
          }
          break;
        }
       
        case 'checkbox': {
          displayValue = <input className={styles['"checkbox"']} type='checkbox' readOnly checked={value ? true : false}/>;
          break;
        }
        
        case 'creator':
        case 'modifier': {
          if (value) {
            const { collaborators } = this.props;
            const collaborator = collaborators.find((item) => {
              return item.email === value;
            });
            displayValue = <div className={styles["collaborators-formatter"]}>
              <div className={styles["formatter-show"]}>
                <div className={styles["collaborator"]}>
                  <span className={styles["collaborator-avatar-container"]}>
                    <img className={styles["collaborator-avatar"]} alt={collaborator.name} src={collaborator.avatar_url} />
                  </span>
                  <span className={styles["collaborator-name"]}>{collaborator.name}</span>
                </div>
              </div>
            </div>;
          }
          break;
        }
        default:
          if (value && typeof value === 'string') {
            displayValue = <span className={styles["cell-value-ellipsis"]}>{value}</span>;
          }
          break;
      }
      return this.getCellRecord(displayValue, rowId, column);
    }
  };

  getCellRecord = (displayValue, rowId, column) => {
    let { key } = column;
    let width = this.getCellRecordWidth(column);
    return (
      <div className={styles["row-cell-value"]} key={rowId + '_' + key} style={{width}}>
        {displayValue ? displayValue : <span className={styles["row-cell-value-empty"]}></span>}
      </div>
    );
  };

  getCellRecordWidth = (column) => {
    let { type, data } = column;
    switch (type) {
      case 'date': {
        let isShowHourAndMinute = data && data.format && data.format.indexOf('HH:mm') > -1;
        return isShowHourAndMinute ? 160 : 100;
      }
      case 'ctime':
      case 'mtime':
      case 'link':
      case 'geolocation': {
        return 160;
      }
      case 'collaborator': {
        return 100;
      }
      case 'checkbox': {
        return 40;
      }
      case 'number': {
        return 120;
      }
      default: {
        return 100;
      }
    }
  };

  handleHorizontalScroll = (e) => {
    this.scrollLeft = e.target.scrollLeft;
    this.recordItems.forEach(item => {
      item.updateRowNameStyles(this.scrollLeft);
    });
  }

  render() {
    const { showDialog, duplicationData, selectedItem, configSettings } = this.props;
    return (
      <Modal contentClassName={styles['modal-content']} isOpen={showDialog} toggle={this.props.toggleDetailDialog} className={styles['deduplication-plugin']}  zIndex={2000}>
        <ModalHeader className={styles['deduplication-plugin-header']} toggle={this.props.toggleDetailDialog}>{intl.get('Deduplication')}</ModalHeader>
        <ModalBody className={styles['deduplication-plugin-content']}>
          <div className={styles['deduplication-plugin-wrapper']}>
            {
              <div className={styles['deduplication-plugin-show']}>
                <div className={styles['table-wrapper']}>
                  <TableView
                    duplicationData={duplicationData}
                    selectedItem={selectedItem}
                    configSettings={configSettings}
                    clickCallback={this.showDetailData}
                  />
                </div>
              </div>
            }
            {
              <div className={`${styles['detail-view-settings']} d-flex flex-column`} onScroll={this.handleHorizontalScroll}>
                {this.renderDetailData()}
              </div>
            }
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

export default DetailDuplicationDialog;
