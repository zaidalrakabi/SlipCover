import React, { Component } from 'react';
import * as queryString from 'query-string';
import ReactPaginate from 'react-paginate';
import Display from './Display.js'
import './App.css';
// import {Button} from 'react-bootstrap';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      allKeys: [],
      currentPage: 1,
      rowsPerPage: 25,
      pageCount: 0,
      value: '',
      searchValue: '',
      foundID: '',
      bucket: ['beer-sample'],
      syncgatewayUrl: 'http://localhost:4984',
      selectedBucket: ''
    };
    this.updateJson = this.updateJson.bind(this);
    this.getChannelFeed = this.getChannelFeed.bind(this);
    this.bucketHandleChecked = this.bucketHandleChecked.bind(this);
    this.searchHandleSubmit = this.searchHandleSubmit.bind(this);
    this.searchHandleChange = this.searchHandleChange.bind(this);
    this.searchDocPerId = this.searchDocPerId.bind(this);
  }

  async getAllAvailableKeys() {
    try {
      const syncgatewayUrl = this.state.syncgatewayUrl;
      const selectedBucket = this.state.selectedBucket;
      const params = {
        access: false,
        include_docs: false,
      }
      const res = await fetch(`${syncgatewayUrl}/${selectedBucket}/_all_docs?${queryString.stringify(params)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw Error('bad ID\'s fetch');
    const json = await res.json();
    const trueResult = json.rows.map(element => element.id);

    const newState = this.state;
    newState.pageCount = Math.ceil(trueResult.length/this.state.rowsPerPage);
    newState.allKeys = trueResult;
    this.setState(newState);
    console.log('this.state.pageCount: ', this.state.pageCount);
    this.getChannelFeed();
  
    return Promise.resolve(trueResult);
    } catch (err) {
      console.log(err);
    }
  }

  async getChannelFeed() {
    console.log(' CURRENT PAGE: ' + this.state.currentPage);
    const startIdx = (this.state.currentPage - 1) * (this.state.rowsPerPage) + 1;
    const endIdx = (this.state.currentPage) * (this.state.rowsPerPage) + 1;

    try {
      const syncgatewayUrl = this.state.syncgatewayUrl;
      const selectedBucket = this.state.selectedBucket;      
      const params = {
        access: false,
        include_docs: true,
        keys: JSON.stringify(this.state.allKeys.slice(startIdx, endIdx )),
      };
      const res = await fetch(`${syncgatewayUrl}/${selectedBucket}/_all_docs?${queryString.stringify(params)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw Error('bad data fetch');
    const json = await res.json();
    const trueResult = json.rows.map(element => element.doc);

    this.setState({ data: trueResult });
    return Promise.resolve(trueResult);
    } catch (err) {
      console.log(err);
    }
  }

  async updateJson(editedDoc, docId){
    const arr = this.state.data;
    let doc = '';
    arr.find((obj, i) => {
      console.log('i: ', i);
      if (obj._id === docId) {
        arr[i] = JSON.parse(editedDoc);
        arr[i]._id = obj._id; // if user try to chnage doc _id
        arr[i]._rev = obj._rev; // if user try to chnage doc _rev
        arr[i].name = 'Ibrahim';
        arr[i].updated = new Date().toJSON();
        doc =  arr[i];
        return true; // stop searching
      }
      return false;
    });
    console.log('doc before update in sync-gateway: ', doc);
    try{
      const syncgatewayUrl = this.state.syncgatewayUrl;
      const selectedBucket = this.state.selectedBucket;            
      const params = {
        new_edits: true,
        rev: doc._rev,
      };;
      const res = await fetch(`${syncgatewayUrl}/${selectedBucket}/${doc._id}?${queryString.stringify(params)}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw Error('bad data fetch');
      this.getChannelFeed();

    }catch (err){
      console.log(err);
    }
  }

  bucketHandleChecked(event) {
    const newState = this.state;
    newState.selectedBucket = event.target.value;
    this.setState(newState, () => {
      console.log('selectedBucket: ', this.state.selectedBucket);
    });
    this.getAllAvailableKeys();
  }

  handlePageClick = (data) => {
    const currentPage = (data.selected + 1);
    this.setState({currentPage: currentPage}, () => {
      this.getChannelFeed();
    });
  };

  searchHandleChange(event){
    console.log('search clicked!');
    this.setState({searchValue: event.target.value});
  }

  // search for doc by ID and return it if found
  searchHandleSubmit(event) {
    const newState = this.state;
    const key = this.state.searchValue.split(' ').join('') // truncate spaces
    const pos = this.state.allKeys.indexOf(key);
    if (pos !== -1){
      newState.foundID = key;
      this.setState(newState);
      this.searchDocPerId(pos);
    }else{
      alert('Document id is not found!');
    }
    event.preventDefault();
  }

  // update page number if doc is found
  searchDocPerId(pos){
    let pageNum = 1;
    while(pos > this.state.rowsPerPage){
      pos -=this.state.rowsPerPage;
      pageNum +=1;
    }
    console.log('Key is found in pageNumber: ', pageNum);
    this.setState({ currentPage: pageNum}, () => {
      this.getChannelFeed();      
    });
  }

  render() {
    return (
      <div>
        <div className="menuBar">
          <h1 className="header"> Sync-Gateway-Cushion Open Source </h1>
          <div className="menuRow">
            {/* Buckets dropdown menu */}
            <div className="bucket-box">
              <select
                className="bucketSelectList"
                onChange={(e) => {
                  this.bucketHandleChecked(e);
                }}
                value={this.state.selectedBucket.value}
              >
                <option key='default'>-- Select Buckets --</option>
                {this.state.bucket.map(m => (
                  <option key={m.toString()} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {/* search document id */}
            <div className="search">
              <form className="inputBox" onSubmit={this.searchHandleSubmit}>
                <input className="label" type="text" name="name" placeholder="Document ID"
                  value={this.state.searchValue} onChange={this.searchHandleChange}
                />
                <input className="submit" type="submit" value="&#x1F50D; Search" />
              </form>
            </div>
          </div>
        </div>

        <div>
          <ReactPaginate previousLabel={"previous"}
            nextLabel={"next"}
            breakLabel={<a href="">...</a>}
            breakClassName={"break-me"}
            pageCount={this.state.pageCount}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            onPageChange={this.handlePageClick}
            containerClassName={"pagination"}
            subContainerClassName={"pages pagination"}
            activeClassName={"active"}
          />
        </div>
        <div>
          {this.state.data.map((object, i) => {
            if (this.state.selectedBucket){
              return (
                <Display
                  key={object._id}
                  index={object._id}
                  prop={object}
                  updateJson={this.updateJson}
                  foundID={this.state.foundID}                  
                />
              );
            }
            return true;
          })}
        </div>
      </div>
    );
  }
}

export default App;
