'use strict';

var express = require('express');
var braintree = require('braintree');
var router = express.Router(); // eslint-disable-line new-cap
var gateway = require('../lib/gateway');
var client1 = require('node-rest-client').Client;
var client = new client1();

var TRANSACTION_SUCCESS_STATUSES = [
  braintree.Transaction.Status.Authorizing,
  braintree.Transaction.Status.Authorized,
  braintree.Transaction.Status.Settled,
  braintree.Transaction.Status.Settling,
  braintree.Transaction.Status.SettlementConfirmed,
  braintree.Transaction.Status.SettlementPending,
  braintree.Transaction.Status.SubmittedForSettlement
];

function formatErrors(errors) {
  var formattedErrors = '';

  for (var i in errors) { // eslint-disable-line no-inner-declarations, vars-on-top
    if (errors.hasOwnProperty(i)) {
      formattedErrors += 'Error: ' + errors[i].code + ': ' + errors[i].message + '\n';
    }
  }
  return formattedErrors;
}

function createResultObject(transaction) {
  var result;
  var status = transaction.status;

  if (TRANSACTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
    result = {
      header: 'Sweet Success!',
      icon: 'success',
      message: 'Your test transaction has been successfully processed. See the Braintree API response and try again.'
    };
  } else {
    result = {
      header: 'Transaction Failed',
      icon: 'fail',
      message: 'Your test transaction has a status of ' + status + '. See the Braintree API response and try again.'
    };
  }

  return result;
}

router.get('/', function (req, res) {
  res.redirect('/checkouts/new');
});

router.get('/checkouts/new', function (req, res) {
  client.get('http://devservices.webjet.co.nz/api/payments/braintreeservice/token', function (data) {

    console.log(data);
    res.render('checkouts/new', {clientToken: data.toString(), messages: req.flash('error')});
  });
});

router.get('/checkouts/:id', function (req, res) {
  var result;
  var transactionId = req.params.id;

  gateway.transaction.find(transactionId, function (err, transaction) {
    result = createResultObject(transaction);
    res.render('checkouts/show', {transaction: transaction, result: result});
  });
});

router.post('/checkouts', function (req, res) {
  var transactionErrors;
  var amount = req.body.amount; // In production you should not take amounts directly from clients
  var nonce = req.body.payment_method_nonce;
  var request = {
    amount: amount,
    nonce: nonce
  };
  var myheader = {'Content-Type': 'application/json'};

  var args = {
    data: request,
    headers: myheader
  };
  
  client.post('https://devservices.webjet.co.nz/api/payments/braintreeservice/transaction', args, function (data, result) {
    if (result.statusCode === 200) {
      if (data.isSuccess) {
        res.redirect('checkouts/' + data.transactionId);
      } else {
        transactionErrors = data.errors;
        req.flash('error', {msg: formatErrors(transactionErrors)});
        res.redirect('checkouts/new');
      }
    } else {
      req.flash('error', {msg: 'status code' + result.statusCode});
      res.redirect('checkouts/new');
    }
  });

});

module.exports = router;
