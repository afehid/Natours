class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(el => delete queryObj[el]);
    //1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); //aggregation values

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; //by multiplying 1 we convert to number from string && ||1 is to define default value
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit; // the formula of pagination
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
module.exports = APIFeatures;

// class APIFeatures {
//   constructor(query, queryString) {
//     this.query = query;
//     this.queryString = queryString;
//   }
//   filter() {
//     // Filtering
//     const queryObj = { ...this.queryString };
//     const excludeFields = ['page', 'sort', 'limit', 'fields'];
//     excludeFields.forEach(el => delete queryObj[el]);
//     //Advanced Filtering
//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
//     this.query = this.query.find(JSON.parse(queryStr));
//     return this;
//   }
//   sort() {
//     if (this.queryString.sort) {
//       const sortBy = this.queryString.sort.split(',').join(' ');
//       this.query = this.query.sort(sortBy);
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }
//     return this;
//   }
//   limitFields() {
//     if (this.queryString.fields) {
//       const fields = this.queryString.fields.split(',').join(' ');
//       this.query = this.query.select(fields);
//     } else {
//       this.query = this.query.select('-__v');
//     }
//     return this;
//   }
//   paginate() {
//     // page = 2 & limit = 10 , 1-10 page 1, 11-20 page 2, 21-30 page 3
//     const page = this.queryString.page * 1 || 1; //by multiplying 1 we convert to number from string && ||1 is to define default value
//     const limit = this.queryString.limit * 1 || 100;
//     const skip = (page - 1) * limit; // the formula of pagination
//     this.query = this.query.skip(skip).limit(limit);
//     return this;
//   }
// }
// module.exports = APIFeatures;
